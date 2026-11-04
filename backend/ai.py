"""Taviz AI: streaming, multilingual, tool-using assistant (Claude API)."""
import os
import config, llm
import asyncio, json, httpx, re
import builder, company_kb
from models import Booking, ChatMessage, Ticket, TicketMessage, User

MODEL = os.getenv("TAVIX_AI_MODEL", "claude-sonnet-4-6")
client = None
if config.backend() == "anthropic" and os.getenv("ANTHROPIC_API_KEY"):
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SECTORS = ["Web Development & Testing", "AI & ML Builds", "Blockchain Technologies",
           "Automotive Software", "Hardware + Software (IoT/Embedded)"]

SYSTEM = f"""You are Taviz AI — the in-house reasoning partner of TAVIZ, not a generic chatbot and not a clone of any vendor model.
You were designed for TAVIZ work: turning a client's messy real-world problem into a clear mission, a themed prototype, and honest next steps.
Founder: Logesh Visvanathan. Motto: Innovation with Honour.
Sectors: {', '.join(SECTORS)}.

Voice:
- Calm, precise, slightly technical. Prefer short structured answers over marketing copy.
- ALWAYS reply in the language the client writes in. Switch if they switch.
- Answer the actual question first. Then, if useful, add one compact "What I would do next" list.
- Never greet again after the first turn. Ask at most one question, and only if you cannot proceed without it.
- Use short paragraphs, "- " bullets, and **bold** for key terms. No emoji walls.

Honesty:
- Never invent prices, deadlines, past clients, live metrics, or legal conclusions.
- If a prototype uses sample data, say so. If a build is still running, say which step.
- For pricing and delivery dates, say the TAVIZ team confirms after review.

Scope:
- You are the assistant on the TAVIZ company website. You answer questions about TAVIZ (company, founder, motive), careers and hiring, the products (today: ONE TAVIZ AI), and how to use the TAVIZ website and ONE TAVIZ AI.
- Use the TAVIZ FACTS given to you. If they do not cover it, say the TAVIZ team can confirm. Never invent roles, salaries, prices, dates, clients or numbers.
- You do not build projects here. If someone wants a project built or wants to learn by building, send them to ONE TAVIZ AI (Products menu, or https://one.tavixai.in).
- For a human, point to the contact details in the website footer.

Tools (local models): when you must call a tool, put this as the LAST line of your reply and nowhere else:
<<TOOL name {{json_args}}>>
Example: <<TOOL get_my_bookings {{}}>>
Stay on TAVIZ topics; for unrelated requests, steer back politely."""

TOOLS = [
    {"name": "create_booking",
     "description": "Create a confirmed booking for the logged-in client after they explicitly agreed.",
     "input_schema": {"type": "object", "properties": {
         "sector": {"type": "string", "enum": SECTORS},
         "title": {"type": "string"}, "problem": {"type": "string"},
         "budget": {"type": "string"}, "language": {"type": "string", "description": "ISO code of client's language"},
         "domain": {"type": "string", "description": "Website or product domain, if provided by the client"},
         "theme": {"type": "string", "description": "Requested visual theme, colors, or design style, if provided by the client"}},
         "required": ["sector", "title", "problem"]}},
    {"name": "get_my_bookings", "description": "List the logged-in client's bookings with status and solutions.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "create_support_ticket",
     "description": "Submit a support complaint or request for the logged-in client only after explicitly confirming the ticket summary with them.",
     "input_schema": {"type": "object", "properties": {
         "subject": {"type": "string", "minLength": 3, "maxLength": 200},
         "message": {"type": "string", "minLength": 3, "maxLength": 3000},
         "category": {"type": "string", "enum": ["general", "build", "billing", "bug", "feature"]},
         "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
         "booking_id": {"type": "integer", "description": "Optional mission ID if the complaint is about a specific mission"},
         "confirmed": {"type": "boolean", "description": "Must be true only after the client clearly confirms the summary"}},
         "required": ["subject", "message", "category", "confirmed"]}},
]


def run_tool(db, user, name, args):
    if not user:
        return "LOGIN_REQUIRED: the client must log in or register on the Taviz website first.", None, None
    if name == "create_booking":
        b = Booking(user_id=user.id, sector=args["sector"], title=args["title"][:200], problem=args["problem"],
                    budget=args.get("budget", ""), language=args.get("language", "en"),
                    domain=args.get("domain", "")[:253], theme=args.get("theme", "")[:300], source="tavix-ai")
        db.add(b); db.commit(); db.refresh(b)
        asyncio.create_task(builder.build(b.id))  # Taviz AI starts building immediately
        return f"Booking #{b.id} created. Taviz AI has started building the requirements, a website prototype and a 3D view; the client can watch it on the My missions page.", b.id, None
    if name == "get_my_bookings":
        rows = db.query(Booking).filter_by(user_id=user.id).order_by(Booking.id.desc()).limit(10).all()
        if not rows:
            return "No bookings yet.", None, None
        return "\n".join(f"#{r.id} {r.title} [{r.sector}] status={r.status} solution={r.solution or 'pending'}" for r in rows), None, None
    if name == "create_support_ticket":
        if args.get("confirmed") is not True:
            return "Ask the client to confirm the ticket summary before submitting it.", None, None
        subject, message = str(args.get("subject", "")).strip(), str(args.get("message", "")).strip()
        category, priority = args.get("category", "general"), args.get("priority", "normal")
        if len(subject) < 3 or len(subject) > 200 or len(message) < 3 or len(message) > 3000:
            return "The ticket needs a subject (3-200 characters) and description (3-3000 characters). Ask the client for the missing details.", None, None
        if category not in ("general", "build", "billing", "bug", "feature"):
            return "Choose a valid ticket category before submitting.", None, None
        if priority not in ("low", "normal", "high", "urgent"):
            priority = "normal"
        booking_id = args.get("booking_id")
        if booking_id is not None:
            booking = db.get(Booking, booking_id)
            if not booking or booking.user_id != user.id:
                return "That mission was not found for this client. Submit without a mission link or ask the client to clarify.", None, None
        ticket = Ticket(user_id=user.id, booking_id=booking_id, subject=subject, category=category, priority=priority,
                        status="open", client_unread=False, admin_unread=True)
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        db.add(TicketMessage(ticket_id=ticket.id, author_role="client", author_name=user.name, body=message))
        db.commit()
        return f"Support ticket #{ticket.id} was submitted to the TAVIZ team. The client can follow replies in My missions > Support tickets.", None, ticket.id
    return "Unknown tool", None, None


TOOL_LINE = re.compile(r"<<TOOL\s+([a-z_]+)\s+(\{.*\})\s*>>\s*$", re.S)


def parse_tool_line(text):
    m = TOOL_LINE.search((text or "").strip())
    if not m:
        return None, text or ""
    try:
        args = json.loads(m.group(2))
    except json.JSONDecodeError:
        return None, text
    cleaned = TOOL_LINE.sub("", text).strip()
    return {"name": m.group(1), "args": args if isinstance(args, dict) else {}}, cleaned


async def stream_local(ws, system, msgs):
    """Stream a reply from the open model. Returns (text, error). Errors are shown to the client but never saved as chat history."""
    sent = {"n": 0}

    async def on_text(full):
        new = full[sent["n"]:]
        if new:
            sent["n"] = len(full); await ws.send_json({"type": "token", "text": new})

    async def on_status(m): await ws.send_json({"type": "status", "text": m})
    try:
        text = await llm.stream_local([{"role": "system", "content": system}] + msgs, 700, model=config.chat_model(),
                                      temperature=0.4, on_text=on_text, on_status=on_status)
        return text, None
    except Exception as e:
        print("chat model error:", e)
        return "", str(e)


def friendly(err):
    if "429" in err or "ate limit" in err: return "The free AI is busy right now (rate limit). Wait about 20 seconds and press Try again."
    if "401" in err or "403" in err: return "The AI key is not accepted. The admin needs to check LOCAL_LLM_KEY in .env."
    if "404" in err: return "The AI model name is not available. The admin needs to check LOCAL_LLM_MODEL in .env."
    if "Connect" in err or "refused" in err: return "Cannot reach the AI model server. If you use the local model, start its window."
    return "Taviz AI could not answer this time. Press Try again."


async def respond(ws, db, user, session_id, history, extra=""):
    """Stream a reply over the websocket; handles tool calls in a loop."""
    question = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    extra = extra + company_kb.facts_block(question, db)

    async def from_facts():
        msg = company_kb.offline_answer(question, db)
        for i in range(0, len(msg), 40):
            await ws.send_json({"type": "token", "text": msg[i:i + 40]})
        db.add(ChatMessage(user_id=user.id if user else None, session_id=session_id, role="assistant", content=msg)); db.commit()
        await ws.send_json({"type": "done"})
    if config.backend() == "local":
        sys = SYSTEM + extra
        hist = [{"role": m["role"], "content": m["content"][:1200]} for m in history if m["role"] in ("user", "assistant")][-10:]
        spoken = ""
        for _ in range(3):
            full, err = await stream_local(ws, sys, hist)
            if err:
                return await from_facts()  # model busy or offline: still answer from the taught facts
            call, visible = parse_tool_line(full)
            spoken = (spoken + "\n" + visible).strip()
            if not call:
                break
            out, bid, ticket_id = run_tool(db, user, call["name"], call["args"])
            if bid:
                await ws.send_json({"type": "booking", "id": bid})
            if ticket_id:
                await ws.send_json({"type": "ticket", "id": ticket_id})
            hist = hist + [
                {"role": "assistant", "content": full[:1500]},
                {"role": "user", "content": f"Tool {call['name']} result: {out}. Continue the answer for the client. Do not invent extra tool calls."},
            ]
        db.add(ChatMessage(user_id=user.id if user else None, session_id=session_id, role="assistant", content=spoken or "Done.")); db.commit()
        return await ws.send_json({"type": "done"})
    if client is None:
        return await from_facts()
    sys = SYSTEM + extra + (f"\nLogged-in client: {user.name}." if user else "\nThe client is NOT logged in.")
    msgs = [{"role": m["role"], "content": m["content"]} for m in history][-20:]
    full = ""
    for _ in range(4):
        async with client.messages.stream(model=MODEL, max_tokens=1024, system=sys, messages=msgs) as s:
            async for t in s.text_stream:
                full += t
                await ws.send_json({"type": "token", "text": t})
            final = await s.get_final_message()
        if final.stop_reason != "tool_use":
            break
        msgs.append({"role": "assistant", "content": [b.model_dump() for b in final.content]})
        results = []
        for b in final.content:
            if b.type == "tool_use":
                out, bid, ticket_id = run_tool(db, user, b.name, b.input)
                if bid:
                    await ws.send_json({"type": "booking", "id": bid})
                if ticket_id:
                    await ws.send_json({"type": "ticket", "id": ticket_id})
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": out})
        msgs.append({"role": "user", "content": results})
        full += "\n"
    db.add(ChatMessage(user_id=user.id if user else None, session_id=session_id, role="assistant", content=full.strip()))
    db.commit()
    await ws.send_json({"type": "done"})
