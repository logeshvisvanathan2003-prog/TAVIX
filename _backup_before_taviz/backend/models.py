import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://tavix:tavix@localhost:5432/tavix")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="client")  # client | admin
    created_at = Column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    sector = Column(String(60), nullable=False)
    summary = Column(Text, default="")
    tech = Column(String(300), default="")
    client = Column(String(150), default="")
    status = Column(String(20), default="ongoing")  # completed | ongoing | upcoming
    progress = Column(Integer, default=0)
    result = Column(Text, default="")
    demo = Column(Boolean, default=False)  # sample data, removable by admin
    source_booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    author = Column(String(120), nullable=False)
    company = Column(String(150), default="")
    rating = Column(Integer, default=5)
    message = Column(Text, nullable=False)
    demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector = Column(String(60), nullable=False)
    title = Column(String(200), nullable=False)
    problem = Column(Text, nullable=False)
    budget = Column(String(80), default="")
    language = Column(String(30), default="en")
    domain = Column(String(253), default="")
    theme = Column(String(300), default="")
    source = Column(String(20), default="form")  # form | tavix-ai
    status = Column(String(20), default="placed")  # placed | reviewing | in_progress | delivered
    solution = Column(Text, default="")
    # Tavix AI build output
    spec = Column(Text, default="")
    site_html = Column(Text, default="")
    scene = Column(Text, default="")
    build_status = Column(String(20), default="queued")  # queued | building | ready | failed
    build_log = Column(Text, default="[]")
    build_error = Column(Text, default="")
    build_provider = Column(String(20), default="")  # anthropic | local
    reviewed = Column(Boolean, default=False)  # a TAVIX engineer approved the build
    build_live = Column(Text, default="")  # text the AI is writing right now (streamed, shown live to the client)
    build_phase = Column(String(80), default="")  # short label of what the AI is doing right now
    build_started = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(64), index=True)
    role = Column(String(12))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    """Support ticket raised by a client (or by the admin on a client's behalf)."""
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    subject = Column(String(200), nullable=False)
    category = Column(String(30), default="general")  # general | build | billing | bug | feature
    priority = Column(String(10), default="normal")  # low | normal | high | urgent
    status = Column(String(20), default="open")  # open | in_progress | resolved | closed
    client_unread = Column(Boolean, default=False)  # admin replied, client has not opened it yet
    admin_unread = Column(Boolean, default=True)  # client wrote, admin has not opened it yet
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)
    author_role = Column(String(10), default="client")  # client | admin
    author_name = Column(String(120), default="")
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeEntry(Base):
    """A fact the admin taught Tavix AI on the 'Teach Tavix AI' tab (company, careers, products, website help)."""
    __tablename__ = "knowledge_entries"
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CareerApplication(Base):
    __tablename__ = "career_applications"
    id = Column(Integer, primary_key=True)
    role = Column(String(120), nullable=False)
    name = Column(String(120), nullable=False)
    email = Column(String(200), nullable=False)
    link = Column(String(400), default="")
    message = Column(Text, default="")
    status = Column(String(20), default="new")  # new | shortlisted | rejected | hired
    created_at = Column(DateTime, default=datetime.utcnow)
