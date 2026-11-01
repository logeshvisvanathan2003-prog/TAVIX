"""Keep Project Transparency in sync with real missions as soon as a build is ready."""
import json
from models import Project


def _tech(spec):
    modules = spec.get("modules", []) if isinstance(spec, dict) else []
    return ", ".join(dict.fromkeys(
        str(m.get("tech", "")).strip() for m in modules if isinstance(m, dict) and m.get("tech")
    ))[:300]


def _status_progress(booking):
    if booking.status == "delivered":
        return "completed", 100
    if booking.reviewed:
        return "ongoing", 85
    if booking.build_status == "ready":
        return "ongoing", 70
    if booking.build_status == "building":
        return "ongoing", 35
    return "upcoming", 10


def upsert_project(db, booking):
    """Create or refresh the public transparency card for this mission."""
    if booking.build_status not in ("ready", "building"):
        return None
    try:
        spec = json.loads(booking.spec or "{}")
    except json.JSONDecodeError:
        spec = {}
    status, progress = _status_progress(booking)
    summary = str(spec.get("summary") or "").strip() or f"Live TAVIX mission in {booking.sector}."
    result = (booking.solution or "").strip()
    if booking.build_status == "ready" and not result:
        result = "Prototype ready in Build Studio. The TAVIX team can still review before final delivery."
    elif not result:
        result = "Tavix AI is assembling the prototype. Progress updates as the build finishes."
    values = {
        "title": booking.title,
        "sector": booking.sector,
        "summary": summary[:2000],
        "tech": _tech(spec) or booking.sector,
        "client": "TAVIX client",
        "status": status,
        "progress": progress,
        "result": result[:4000],
        "demo": False,
    }
    project = db.query(Project).filter_by(source_booking_id=booking.id).first()
    if project is None:
        project = Project(source_booking_id=booking.id, **values)
        db.add(project)
    else:
        for key, value in values.items():
            setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project
