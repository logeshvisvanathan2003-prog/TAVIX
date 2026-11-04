import config  # loads .env first
import asyncio, os, uuid, json
from datetime import datetime, timedelta
from urllib.parse import quote
import bcrypt
from fastapi import FastAPI, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from jose import jwt
from pydantic import BaseModel, Field
from sqlalchemy import func, inspect
from models import Base, engine, SessionLocal, User, Project, Feedback, Booking, ChatMessage, Ticket, TicketMessage, KnowledgeEntry, CareerApplication
import ai, builder, company_kb
from project_export import project_archive
from transparency import upsert_project
from sqlalchemy import text
from fastapi import BackgroundTasks

SECRET = os.getenv("SECRET_KEY", "change-me-in-production")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "logesh@tavix.in")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ChangeMe@123")
print("[TAVIZ]", config.describe(), "| .env:", config.LOADED or "NOT FOUND")
STATUSES = ["placed", "reviewing", "in_progress", "delivered"]

app = FastAPI(title="TAVIZ API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(","),
                   allow_methods=["*"], allow_headers=["*"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_pw(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def check_pw(p, h): return bcrypt.checkpw(p.encode(), h.encode())
def make_token(u): return jwt.encode({"sub": str(u.id), "exp": datetime.utcnow() + timedelta(days=7)}, SECRET, algorithm="HS256")


def user_from_token(db, t):
    try:
        return db.get(User, int(jwt.decode(t, SECRET, algorithms=["HS256"])["sub"]))
    except Exception:
        return None


def current_user(authorization: str | None = Header(None), db=Depends(get_db)):
    u = user_from_token(db, authorization.split()[-1]) if authorization else None
    if not u:
        raise HTTPException(401, "Please log in")
    return u


def admin_only(u=Depends(current_user)):
    if u.role != "admin":
        raise HTTPException(403, "Admin only")
    return u


def d(o, heavy=False):
    out = {}
    for c in o.__table__.columns:
        v = getattr(o, c.name)
        out[c.name] = v.isoformat() if isinstance(v, datetime) else v
    out.pop("password_hash", None)
    out.pop("source_booking_id", None)
    if not heavy: out.pop("site_html", None); out.pop("build_live", None)
    return out


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with engine.begin() as c:  # lightweight migrations for databases created by v1
        for q in ["ALTER TABLE projects ADD COLUMN IF NOT EXISTS result TEXT DEFAULT ''",
                  "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS project_id INTEGER",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS spec TEXT DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS site_html TEXT DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_status VARCHAR(20) DEFAULT 'queued'",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_log TEXT DEFAULT '[]'",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_provider VARCHAR(20) DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_error TEXT DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_live TEXT DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_phase VARCHAR(80) DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS build_started TIMESTAMP",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS domain VARCHAR(253) DEFAULT ''",
                  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS theme VARCHAR(300) DEFAULT ''",
                  "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'general'",
                  "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_unread BOOLEAN DEFAULT FALSE",
                  "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS admin_unread BOOLEAN DEFAULT TRUE",
                  "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS author_role VARCHAR(10) DEFAULT 'client'",
                  "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS author_name VARCHAR(120) DEFAULT ''",
                  "ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS body TEXT DEFAULT ''",
                  "ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_booking_id INTEGER REFERENCES bookings(id)",
                  "CREATE UNIQUE INDEX IF NOT EXISTS ix_projects_source_booking_id ON projects (source_booking_id)"]:
            c.execute(text(q))
        message_columns = {column["name"] for column in inspect(c).get_columns("ticket_messages")}
        if {"message", "is_admin"}.issubset(message_columns):
            c.execute(text("""
                UPDATE ticket_messages
                SET body = message,
                    author_role = CASE WHEN is_admin THEN 'admin' ELSE 'client' END
                WHERE body = '' AND message IS NOT NULL
            """))
        for legacy_column in ("message", "is_admin", "user_id"):
            if legacy_column in message_columns:
                c.execute(text(f'ALTER TABLE ticket_messages ALTER COLUMN "{legacy_column}" DROP NOT NULL'))
        if "user_id" in message_columns:
            c.execute(text("""
                UPDATE ticket_messages AS messages
                SET author_name = users.name
                FROM users
                WHERE messages.user_id = users.id AND messages.author_name = ''
            """))
    db = SessionLocal()
    if not db.query(User).filter_by(email=ADMIN_EMAIL).first():
        db.add(User(name="Logesh Visvanathan", email=ADMIN_EMAIL, password_hash=hash_pw(ADMIN_PASSWORD), role="admin"))
    if db.query(Project).count() == 0:
        # SAMPLE placeholders so the UI is not empty. Flagged demo=True, shown as "Sample" and removable from the admin panel.
        for t, s, sm, te, st, p in [
            ("Fleet Telemetry Dashboard", "Automotive Software", "Live vehicle health and driver-behaviour dashboard.", "React, FastAPI, PostgreSQL", "completed", 100),
            ("Predictive Maintenance Model", "AI & ML Builds", "Failure prediction from sensor streams.", "Python, scikit-learn", "ongoing", 64),
            ("Service-History Ledger", "Blockchain Technologies", "Tamper-proof vehicle service records.", "Solidity, Web3", "ongoing", 38),
            ("ECU Data Logger", "Hardware + Software (IoT/Embedded)", "CAN-bus logger with cloud sync.", "ESP32, MQTT, C++", "upcoming", 5)]:
            db.add(Project(title=t, sector=s, summary=sm, tech=te, status=st, progress=p, client="Sample", demo=True))
    # Missions saved before the AI builder existed (or interrupted by a restart) are picked up again
    global _tasks
    for (bid,) in db.query(Booking.id).filter(Booking.build_status.in_(["queued", "building"])).all():
        _tasks.add(t := asyncio.get_running_loop().create_task(builder.build(bid))); t.add_done_callback(_tasks.discard)
    db.commit(); db.close()


_tasks = set()


# ---------- auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=100)


class LoginIn(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
def register(b: RegisterIn, db=Depends(get_db)):
    email = b.email.lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(400, "Email already registered")
    u = User(name=b.name, email=email, password_hash=hash_pw(b.password)); db.add(u); db.commit(); db.refresh(u)
    return {"token": make_token(u), "user": d(u)}


@app.post("/api/auth/login")
def login(b: LoginIn, db=Depends(get_db)):
    u = db.query(User).filter_by(email=b.email.lower()).first()
    if not u or not check_pw(b.password, u.password_hash):
        raise HTTPException(401, "Wrong email or password")
    if u.role == "admin":
        raise HTTPException(403, "Admin accounts sign in on the admin page: /admin/login")
    return {"token": make_token(u), "user": d(u)}


@app.post("/api/auth/admin-login")
def admin_login(b: LoginIn, db=Depends(get_db)):
    u = db.query(User).filter_by(email=b.email.lower()).first()
    if not u or u.role != "admin" or not check_pw(b.password, u.password_hash):
        raise HTTPException(401, "Wrong admin email or password")
    return {"token": make_token(u), "user": d(u)}


ONE_URL = os.getenv("ONE_TAVIX_URL", "https://one.tavixai.in").rstrip("/")
ONE_KEY = os.getenv("ONE_TAVIX_KEY", "").strip()


@app.get("/api/admin/onetavix/{part}")
async def onetavix(part: str, q: str = "", _=Depends(admin_only)):
    """Server-to-server read of ONE TAVIZ AI (users, sign-ins, activity). The key never reaches the browser."""
    import httpx
    if part not in ("summary", "users", "activity"):
        raise HTTPException(404, "Unknown section")
    if not ONE_KEY:
        raise HTTPException(503, "ONE_TAVIX_KEY is not set in the website .env, so ONE TAVIZ AI cannot be read yet.")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{ONE_URL}/api/partner/{part}", params={"q": q} if part == "users" and q else None, headers={"X-Partner-Key": ONE_KEY})
    except Exception:
        raise HTTPException(502, "Cannot reach ONE TAVIZ AI right now.")
    if r.status_code == 401:
        raise HTTPException(502, "ONE TAVIZ AI rejected the key. ONE_TAVIX_KEY must equal PARTNER_API_KEY on that server.")
    if r.status_code == 503:
        raise HTTPException(502, "PARTNER_API_KEY is empty on the ONE TAVIZ AI server, so the feature is switched off there.")
    if r.status_code != 200:
        raise HTTPException(502, f"ONE TAVIZ AI answered {r.status_code}. Deploy its v21 update first.")
    return r.json()


@app.get("/api/ai/health")
async def ai_health():
    import httpx
    if config.backend() == "local":
        base = config.local_url().split("/chat/completions")[0] + "/models"
        try:
            async with httpx.AsyncClient(timeout=6) as c: r = await c.get(base, headers=config.local_headers())
            if r.status_code in (401, 403):
                return {"backend": "local", "online": False, "detail": "Model server rejected the token. Check LOCAL_LLM_KEY in .env."}
            return {"backend": "local", "online": r.status_code < 500, "detail": f"Model server answered. Model: {config.local_model()}"}
        except Exception:
            return {"backend": "local", "online": False, "detail": "Cannot reach the model server. Check LOCAL_LLM_URL and your internet (or start the MLX window)."}
    ok = bool(os.getenv("ANTHROPIC_API_KEY"))
    return {"backend": "claude", "online": ok, "detail": "API key found." if ok else "ANTHROPIC_API_KEY is not set in .env."}


@app.get("/api/auth/me")
def me(u=Depends(current_user)): return d(u)


# ---------- public ----------
@app.get("/api/projects")
def projects(db=Depends(get_db)):
    agg = {pid: (n, a) for pid, n, a in db.query(Feedback.project_id, func.count(), func.avg(Feedback.rating)).filter(Feedback.project_id.isnot(None)).group_by(Feedback.project_id)}
    return [{**d(p), "review_count": agg.get(p.id, (0, 0))[0], "avg_rating": round(float(agg.get(p.id, (0, 0))[1] or 0), 1)} for p in db.query(Project).order_by(Project.id.desc())]


@app.get("/api/feedback")
def feedback(project_id: int | None = None, db=Depends(get_db)):
    q = db.query(Feedback)
    if project_id: q = q.filter_by(project_id=project_id)
    return [{k: v for k, v in d(f).items() if k != "user_id"} for f in q.order_by(Feedback.id.desc()).limit(50)]


@app.get("/api/feedback/mine")
def my_feedback(u=Depends(current_user), db=Depends(get_db)):
    return [f.project_id for f in db.query(Feedback).filter_by(user_id=u.id).filter(Feedback.project_id.isnot(None))]


class FeedbackIn(BaseModel):
    message: str = Field(min_length=5, max_length=1000)
    rating: int = Field(ge=1, le=5)
    company: str = ""
    project_id: int | None = None


@app.post("/api/feedback")
def post_feedback(b: FeedbackIn, u=Depends(current_user), db=Depends(get_db)):
    if b.project_id:
        if not db.get(Project, b.project_id): raise HTTPException(404, "Project not found")
        if db.query(Feedback).filter_by(user_id=u.id, project_id=b.project_id).first(): raise HTTPException(400, "You already reviewed this project")
    f = Feedback(user_id=u.id, project_id=b.project_id, author=u.name, company=b.company, rating=b.rating, message=b.message)
    db.add(f); db.commit(); db.refresh(f)
    return d(f)


# ---------- bookings ----------
class BookingIn(BaseModel):
    sector: str
    title: str = Field(min_length=3, max_length=200)
    problem: str = Field(min_length=10)
    budget: str = ""
    language: str = "en"
    domain: str = Field(default="", max_length=253)
    theme: str = Field(default="", max_length=300)


@app.post("/api/bookings")
def book(b: BookingIn, bg: BackgroundTasks, u=Depends(current_user), db=Depends(get_db)):
    x = Booking(user_id=u.id, **b.model_dump()); db.add(x); db.commit(); db.refresh(x)
    bg.add_task(builder.build, x.id)  # Taviz AI starts building right away
    return d(x)


def own_booking(bid, u, db):
    x = db.get(Booking, bid)
    if not x or (x.user_id != u.id and u.role != "admin"): raise HTTPException(404, "Mission not found")
    return x


@app.get("/api/bookings/{bid}/build")
def build_detail(bid: int, u=Depends(current_user), db=Depends(get_db)): return d(own_booking(bid, u, db), heavy=True)


@app.get("/api/bookings/{bid}/download")
def download_build(bid: int, u=Depends(current_user), db=Depends(get_db)):
    b = own_booking(bid, u, db)
    if b.build_status != "ready" or not b.site_html:
        raise HTTPException(409, "The project ZIP is available when the AI build is ready.")
    slug, archive = project_archive(b.title, b.site_html, b.spec, b.scene, b.domain, b.theme, b.sector)
    filename = quote(f"{slug}.zip")
    return Response(
        archive,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )


class ReviseIn(BaseModel):
    instruction: str = Field(min_length=5, max_length=2000)


@app.post("/api/bookings/{bid}/revise")
def revise(bid: int, b: ReviseIn, bg: BackgroundTasks, u=Depends(current_user), db=Depends(get_db)):
    x = own_booking(bid, u, db)
    if x.build_status == "building": raise HTTPException(400, "Taviz AI is still building. Wait for it to finish.")
    x.build_status = "building"; x.build_log = "[]"; db.commit()
    bg.add_task(builder.build, x.id, b.instruction)
    return {"ok": True}


@app.post("/api/bookings/{bid}/retry")
def retry(bid: int, bg: BackgroundTasks, u=Depends(current_user), db=Depends(get_db)):
    x = own_booking(bid, u, db)
    if x.build_status == "building": raise HTTPException(400, "Taviz AI is already building this mission")
    x.build_status = "building"; x.build_log = "[]"; db.commit(); bg.add_task(builder.build, x.id)
    return {"ok": True}


@app.post("/api/admin/bookings/{bid}/rebuild")
def rebuild(bid: int, bg: BackgroundTasks, _=Depends(admin_only), db=Depends(get_db)):
    x = db.get(Booking, bid)
    if not x: raise HTTPException(404)
    x.build_status = "building"; x.build_log = "[]"; db.commit(); bg.add_task(builder.build, bid)
    return {"ok": True}


@app.get("/api/bookings/mine")
def my_bookings(u=Depends(current_user), db=Depends(get_db)):
    return [d(x) for x in db.query(Booking).filter_by(user_id=u.id).order_by(Booking.id.desc())]


@app.get("/api/chats/mine")
def my_chats(u=Depends(current_user), db=Depends(get_db)):
    rows = (db.query(ChatMessage)
            .filter(ChatMessage.user_id == u.id)
            .order_by(ChatMessage.id.desc())
            .limit(5000)
            .all())
    sessions = {}
    for row in reversed(rows):
        if not row.session_id:
            continue
        chat = sessions.setdefault(row.session_id, {
            "session_id": row.session_id,
            "title": "New conversation",
            "preview": "",
            "message_count": 0,
            "updated_at": row.created_at.isoformat() if row.created_at else "",
            "_has_title": False,
        })
        chat["message_count"] += 1
        chat["preview"] = row.content[:120]
        chat["updated_at"] = row.created_at.isoformat() if row.created_at else chat["updated_at"]
        if row.role == "user" and not chat["_has_title"]:
            chat["title"] = row.content[:80] or "New conversation"
            chat["_has_title"] = True
    result = sorted(sessions.values(), key=lambda chat: chat["updated_at"], reverse=True)
    for chat in result:
        chat.pop("_has_title")
    return result


@app.delete("/api/chats/mine/{session_id}")
def delete_my_chat(session_id: str, u=Depends(current_user), db=Depends(get_db)):
    deleted = (db.query(ChatMessage)
               .filter(ChatMessage.user_id == u.id, ChatMessage.session_id == session_id)
               .delete(synchronize_session=False))
    if not deleted:
        raise HTTPException(404, "Conversation not found")
    db.commit()
    return {"ok": True, "deleted_messages": deleted}



# ---------- support tickets ----------
CATEGORIES = ["general", "build", "billing", "bug", "feature"]
PRIORITIES = ["low", "normal", "high", "urgent"]
TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"]


class TicketIn(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=3, max_length=3000)
    category: str = "general"
    priority: str = "normal"
    booking_id: int | None = None


class ReplyIn(BaseModel):
    message: str = Field(min_length=1, max_length=3000)


def tdict(db, t, msgs=False):
    out = d(t)
    ms = db.query(TicketMessage).filter_by(ticket_id=t.id).order_by(TicketMessage.id).all()
    out["message_count"] = len(ms)
    out["preview"] = (ms[-1].body[:120] if ms else "")
    out["last_by"] = ms[-1].author_role if ms else ""
    if t.booking_id:
        bk = db.get(Booking, t.booking_id); out["booking_title"] = bk.title if bk else ""
    if msgs: out["messages"] = [d(m) for m in ms]
    return out


def new_ticket(db, owner, b, role, author):
    if b.category not in CATEGORIES or b.priority not in PRIORITIES: raise HTTPException(400, "Bad category or priority")
    if b.booking_id:
        bk = db.get(Booking, b.booking_id)
        if not bk or bk.user_id != owner.id: raise HTTPException(404, "Mission not found")
    t = Ticket(user_id=owner.id, booking_id=b.booking_id, subject=b.subject, category=b.category, priority=b.priority,
               client_unread=(role == "admin"), admin_unread=(role == "client"))
    db.add(t); db.commit(); db.refresh(t)
    db.add(TicketMessage(ticket_id=t.id, author_role=role, author_name=author.name, body=b.message)); db.commit()
    return t


@app.post("/api/tickets")
def raise_ticket(b: TicketIn, u=Depends(current_user), db=Depends(get_db)):
    return tdict(db, new_ticket(db, u, b, "client", u), True)


@app.get("/api/tickets/mine")
def my_tickets(u=Depends(current_user), db=Depends(get_db)):
    return [tdict(db, t) for t in db.query(Ticket).filter_by(user_id=u.id).order_by(Ticket.updated_at.desc())]


def own_ticket(tid, u, db):
    t = db.get(Ticket, tid)
    if not t or (t.user_id != u.id and u.role != "admin"): raise HTTPException(404, "Ticket not found")
    return t


@app.get("/api/tickets/{tid}")
def ticket_detail(tid: int, u=Depends(current_user), db=Depends(get_db)):
    t = own_ticket(tid, u, db)
    if u.role == "admin": t.admin_unread = False
    else: t.client_unread = False
    db.commit()
    return tdict(db, t, True)


@app.post("/api/tickets/{tid}/reply")
def ticket_reply(tid: int, b: ReplyIn, u=Depends(current_user), db=Depends(get_db)):
    t = own_ticket(tid, u, db)
    if t.status == "closed": raise HTTPException(400, "This ticket is closed. Raise a new ticket.")
    role = "admin" if u.role == "admin" else "client"
    db.add(TicketMessage(ticket_id=t.id, author_role=role, author_name=u.name, body=b.message))
    if role == "admin":
        t.client_unread = True
        if t.status == "open": t.status = "in_progress"
    else:
        t.admin_unread = True
        if t.status == "resolved": t.status = "open"  # client wrote again: reopen
    t.updated_at = datetime.utcnow(); db.commit()
    return tdict(db, t, True)


class TicketUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None


@app.get("/api/admin/tickets")
def admin_tickets(status: str | None = None, _=Depends(admin_only), db=Depends(get_db)):
    q = db.query(Ticket, User).join(User, User.id == Ticket.user_id)
    if status: q = q.filter(Ticket.status == status)
    return [{**tdict(db, t), "client_name": u.name, "client_email": u.email} for t, u in q.order_by(Ticket.updated_at.desc()).limit(300)]


@app.patch("/api/admin/tickets/{tid}")
def admin_ticket_update(tid: int, b: TicketUpdate, _=Depends(admin_only), db=Depends(get_db)):
    t = db.get(Ticket, tid)
    if not t: raise HTTPException(404)
    if b.status:
        if b.status not in TICKET_STATUSES: raise HTTPException(400, "Bad status")
        if b.status != t.status: t.client_unread = True
        t.status = b.status
    if b.priority:
        if b.priority not in PRIORITIES: raise HTTPException(400, "Bad priority")
        t.priority = b.priority
    t.updated_at = datetime.utcnow(); db.commit()
    return tdict(db, t)


class AdminTicketIn(TicketIn):
    user_id: int


@app.post("/api/admin/tickets")
def admin_raise_ticket(b: AdminTicketIn, a=Depends(admin_only), db=Depends(get_db)):
    owner = db.get(User, b.user_id)
    if not owner: raise HTTPException(404, "Client not found")
    return tdict(db, new_ticket(db, owner, b, "admin", a), True)


# ---------- admin ----------
@app.get("/api/admin/stats")
def stats(_=Depends(admin_only), db=Depends(get_db)):
    by = dict(db.query(Booking.status, func.count()).group_by(Booking.status).all())
    builds = dict(db.query(Booking.build_status, func.count()).group_by(Booking.build_status).all())
    tk = dict(db.query(Ticket.status, func.count()).group_by(Ticket.status).all())
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return {"users": db.query(User).filter(User.role != "admin").count(), "bookings": db.query(Booking).count(), "by_status": by, "builds": builds,
            "chats": db.query(ChatMessage).count(), "feedback": db.query(Feedback).count(),
            "ai_bookings": db.query(Booking).filter_by(source="tavix-ai").count(),
            "tickets": tk, "tickets_open": tk.get("open", 0) + tk.get("in_progress", 0),
            "tickets_unread": db.query(Ticket).filter_by(admin_unread=True).count(),
            "new_users_today": db.query(User).filter(User.created_at >= today, User.role != "admin").count(),
            "new_bookings_today": db.query(Booking).filter(Booking.created_at >= today).count()}


@app.get("/api/admin/activity")
def activity(_=Depends(admin_only), db=Depends(get_db)):
    ev = []
    for u in db.query(User).filter(User.role != "admin").order_by(User.id.desc()).limit(15):
        ev.append({"type": "signup", "at": u.created_at, "text": f"{u.name} registered ({u.email})"})
    for bk, u in db.query(Booking, User).join(User, User.id == Booking.user_id).order_by(Booking.id.desc()).limit(25):
        ev.append({"type": "mission", "at": bk.created_at, "text": f"{u.name} launched mission #{bk.id} “{bk.title}” · build {bk.build_status}"})
    for t, u in db.query(Ticket, User).join(User, User.id == Ticket.user_id).order_by(Ticket.id.desc()).limit(20):
        ev.append({"type": "ticket", "at": t.created_at, "text": f"{u.name} raised ticket #{t.id} “{t.subject}” [{t.priority}]"})
    ev.sort(key=lambda e: e["at"], reverse=True)
    return [{**e, "at": e["at"].isoformat()} for e in ev[:40]]


@app.get("/api/admin/bookings")
def all_bookings(_=Depends(admin_only), db=Depends(get_db)):
    rows = db.query(Booking, User).join(User, User.id == Booking.user_id).order_by(Booking.id.desc()).all()
    return [{**d(b), "client_name": u.name, "client_email": u.email} for b, u in rows]


class BookingUpdate(BaseModel):
    status: str | None = None
    solution: str | None = None
    reviewed: bool | None = None
    spec: str | None = None
    site_html: str | None = None


@app.patch("/api/admin/bookings/{bid}")
def update_booking(bid: int, b: BookingUpdate, _=Depends(admin_only), db=Depends(get_db)):
    x = db.get(Booking, bid)
    if not x: raise HTTPException(404)
    if b.status:
        if b.status not in STATUSES: raise HTTPException(400, "Bad status")
        x.status = b.status
    if b.solution is not None: x.solution = b.solution
    if b.reviewed is not None: x.reviewed = b.reviewed
    if b.spec is not None:
        try: json.loads(b.spec)
        except Exception: raise HTTPException(400, "Spec must be valid JSON")
        x.spec = b.spec
    if b.site_html is not None: x.site_html = b.site_html
    db.commit()
    upsert_project(db, x)
    db.refresh(x)
    return d(x)


@app.get("/api/admin/users")
def users(_=Depends(admin_only), db=Depends(get_db)):
    def cnt(model, col, *flt):
        q = db.query(col, func.count())
        for f in flt: q = q.filter(f)
        return dict(q.group_by(col).all())
    miss = cnt(Booking, Booking.user_id); ready = cnt(Booking, Booking.user_id, Booking.build_status == "ready")
    tk = cnt(Ticket, Ticket.user_id); msgs = cnt(ChatMessage, ChatMessage.user_id, ChatMessage.role == "user")
    last = dict(db.query(Booking.user_id, func.max(Booking.created_at)).group_by(Booking.user_id).all())
    out = []
    for u in db.query(User).order_by(User.id.desc()):
        x = d(u); li = last.get(u.id)
        x.update(missions=miss.get(u.id, 0), builds_ready=ready.get(u.id, 0), tickets=tk.get(u.id, 0), ai_messages=msgs.get(u.id, 0), last_mission=li.isoformat() if li else None)
        out.append(x)
    return out


@app.get("/api/admin/users/{uid}")
def user_detail(uid: int, _=Depends(admin_only), db=Depends(get_db)):
    u = db.get(User, uid)
    if not u: raise HTTPException(404)
    return {"user": d(u), "missions": [d(x) for x in db.query(Booking).filter_by(user_id=uid).order_by(Booking.id.desc())],
            "tickets": [tdict(db, t) for t in db.query(Ticket).filter_by(user_id=uid).order_by(Ticket.id.desc())]}


@app.get("/api/admin/chats")
def chats(_=Depends(admin_only), db=Depends(get_db)):
    rows = db.query(ChatMessage).order_by(ChatMessage.id.desc()).limit(300).all()
    return [d(r) for r in rows]


class ProjectIn(BaseModel):
    title: str; sector: str; summary: str = ""; tech: str = ""; client: str = ""
    status: str = "ongoing"; progress: int = Field(0, ge=0, le=100); result: str = ""


@app.post("/api/admin/projects")
def add_project(b: ProjectIn, _=Depends(admin_only), db=Depends(get_db)):
    p = Project(**b.model_dump()); db.add(p); db.commit(); db.refresh(p); return d(p)


@app.patch("/api/admin/projects/{pid}")
def edit_project(pid: int, b: ProjectIn, _=Depends(admin_only), db=Depends(get_db)):
    p = db.get(Project, pid)
    if not p: raise HTTPException(404)
    for k, v in b.model_dump().items(): setattr(p, k, v)
    p.demo = False; db.commit(); return d(p)


@app.post("/api/admin/bookings/{bid}/publish")
def publish_build(bid: int, _=Depends(admin_only), db=Depends(get_db)):
    b = db.get(Booking, bid)
    if not b:
        raise HTTPException(404, "Mission not found")
    if b.build_status != "ready":
        raise HTTPException(409, "Only ready builds can be published.")
    project = upsert_project(db, b)
    if not project:
        raise HTTPException(409, "The build could not be published yet.")
    return d(project)


@app.delete("/api/admin/demo")
def clear_demo(_=Depends(admin_only), db=Depends(get_db)):
    db.query(Project).filter_by(demo=True).delete(); db.query(Feedback).filter_by(demo=True).delete(); db.commit()
    return {"ok": True}


def spec_brief(spec_json):
    try: sp = json.loads(spec_json)
    except Exception: return "Requirements: not ready yet."
    return (f"Requirements summary: {sp.get('summary', '')[:500]}\nFeatures: {'; '.join(map(str, sp.get('features', [])[:8]))[:600]}\n"
            f"Modules: {', '.join(str(m.get('name', '')) for m in sp.get('modules', [])[:8])}\nRisks: {'; '.join(map(str, sp.get('risks', [])[:4]))[:300]}")


# ---------- Taviz AI websocket ----------

# ---------- careers + teach Taviz AI ----------
class ApplyIn(BaseModel):
    role: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    link: str = Field(default="", max_length=400)
    message: str = Field(default="", max_length=3000)


@app.post("/api/careers/apply")
def career_apply(b: ApplyIn, db=Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=1)
    if db.query(CareerApplication).filter(CareerApplication.email == b.email.lower(), CareerApplication.created_at >= since).count() >= 3:
        raise HTTPException(429, "You already applied a few times in the last hour. Please wait a bit.")
    db.add(CareerApplication(role=b.role.strip(), name=b.name.strip(), email=b.email.lower(), link=b.link.strip(), message=b.message.strip()))
    db.commit()
    return {"ok": True}


class StatusIn(BaseModel):
    status: str = Field(pattern="^(new|shortlisted|rejected|hired)$")


@app.get("/api/admin/careers")
def admin_careers(_=Depends(admin_only), db=Depends(get_db)):
    return [d(x) for x in db.query(CareerApplication).order_by(CareerApplication.id.desc()).limit(500)]


@app.patch("/api/admin/careers/{aid}")
def admin_career_status(aid: int, b: StatusIn, _=Depends(admin_only), db=Depends(get_db)):
    x = db.get(CareerApplication, aid)
    if not x: raise HTTPException(404, "Application not found")
    x.status = b.status; db.commit(); return d(x)


class KnowIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=3, max_length=4000)
    active: bool = True


@app.get("/api/admin/knowledge")
def know_list(_=Depends(admin_only), db=Depends(get_db)):
    return {"custom": [d(x) for x in db.query(KnowledgeEntry).order_by(KnowledgeEntry.id.desc())],
            "built_in": [{"title": h, "body": b} for h, b in company_kb._file_chunks()]}


@app.post("/api/admin/knowledge")
def know_add(b: KnowIn, _=Depends(admin_only), db=Depends(get_db)):
    x = KnowledgeEntry(title=b.title.strip(), body=b.body.strip(), active=b.active); db.add(x); db.commit(); return d(x)


@app.put("/api/admin/knowledge/{kid}")
def know_edit(kid: int, b: KnowIn, _=Depends(admin_only), db=Depends(get_db)):
    x = db.get(KnowledgeEntry, kid)
    if not x: raise HTTPException(404, "Entry not found")
    x.title, x.body, x.active = b.title.strip(), b.body.strip(), b.active; db.commit(); return d(x)


@app.delete("/api/admin/knowledge/{kid}")
def know_del(kid: int, _=Depends(admin_only), db=Depends(get_db)):
    x = db.get(KnowledgeEntry, kid)
    if x: db.delete(x); db.commit()
    return {"ok": True}


@app.get("/api/admin/knowledge/test")
def know_test(q: str, _=Depends(admin_only), db=Depends(get_db)):
    """What would Taviz AI answer, and which facts does it find? Lets the admin check what it learned."""
    return {"answer": company_kb.offline_answer(q, db), "matches": [{"score": round(s, 2), "title": h} for s, h, _b in company_kb.search(q, db, 5)]}


@app.get("/api/admin/knowledge/export")
def know_export(_=Depends(admin_only), db=Depends(get_db)):
    """Question/answer pairs (JSON) for fine-tuning your own model on the company facts."""
    return [{"messages": [{"role": "user", "content": h if h.endswith("?") else h + "?"}, {"role": "assistant", "content": b}]} for h, b in company_kb.qa_pairs(db)]

@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket, token: str | None = None, session: str | None = None, mission: int | None = None):
    await ws.accept()
    db = SessionLocal()
    user = user_from_token(db, token) if token else None
    sid = (session or uuid.uuid4().hex)[:64]
    extra = ""
    mb = db.get(Booking, mission) if (mission and user) else None
    if mb and (mb.user_id == user.id):
        extra = (f"\nThis chat is about the client's mission #{mb.id} '{mb.title}' ({mb.sector}). Client request: {mb.problem[:700]}\n"
                 f"Build status: {mb.build_status} ({mb.build_phase or 'idle'}). Mission status: {mb.status}.\n{spec_brief(mb.spec)}\n"
                 "Answer from this mission's real details only. Explain what Taviz AI built, answer questions about it, and help the client decide changes "
                 "(they send changes in the 'Request changes' tab). If the build is not ready, say what step it is on.")
    rows = (db.query(ChatMessage)
            .filter_by(session_id=sid, user_id=user.id if user else None)
            .order_by(ChatMessage.id)
            .all()[-30:])
    history = [{"role": r.role, "content": r.content} for r in rows]
    await ws.send_json({"type": "history", "messages": history, "logged_in": bool(user)})
    try:
        while True:
            text = (await ws.receive_text()).strip()[:2000]
            if not text: continue
            history.append({"role": "user", "content": text})
            db.add(ChatMessage(user_id=user.id if user else None, session_id=sid, role="user", content=text)); db.commit()
            try:
                await ai.respond(ws, db, user, sid, history, extra)
            except WebSocketDisconnect:
                raise
            except Exception as e:
                await ws.send_json({"type": "token", "text": "Sorry, Taviz AI hit a problem. Please try again."})
                await ws.send_json({"type": "done"}); print("AI error:", e)
            last = db.query(ChatMessage).filter_by(session_id=sid).order_by(ChatMessage.id.desc()).first()
            if last and last.role == "assistant": history.append({"role": "assistant", "content": last.content})
    except WebSocketDisconnect:
        pass
    finally:
        db.close()
