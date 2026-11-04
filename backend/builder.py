"""Taviz AI builder: client request -> requirements spec -> website prototype -> 3D architecture scene."""
import asyncio, json, os, re, time
from datetime import datetime
from html import escape, unescape
from urllib.parse import urlsplit
from models import SessionLocal, Booking
import llm
import config
from theme_engine import compose_theme, inject_theme, theme_prompt
from transparency import upsert_project

LAYERS = ["client", "api", "ai", "data", "blockchain", "hardware"]


def first_json(t):
    i, j = t.find("{"), t.rfind("}")
    return json.loads(t[i:j + 1])


def strip_fence(t):
    t = re.sub(r"^```[a-z]*\s*|```\s*$", "", t.strip(), flags=re.M).strip()
    i = t.lower().find("<!doctype")
    return t[i:] if i >= 0 else t


def fallback_scene(spec):
    nodes = [{"id": "ui", "label": "Web app", "layer": "client"}, {"id": "api", "label": "API", "layer": "api"}, {"id": "db", "label": "Database", "layer": "data"}]
    edges = [["ui", "api"], ["api", "db"]]
    for i, m in enumerate(spec.get("modules", [])[:6]):
        nodes.append({"id": f"m{i}", "label": m.get("name", "Module")[:24], "layer": "ai"}); edges.append(["api", f"m{i}"])
    return {"nodes": nodes, "edges": edges}


def site_tokens():
    v = os.getenv("BUILD_SITE_TOKENS", "").strip()
    if v.isdigit(): return int(v)
    u = config.local_url()
    return 3500 if config.backend() == "local" and ("groq.com" in u or "cerebras.ai" in u) else 6000


def finish_html(h):
    """Free models sometimes stop mid-page. Close what is open so the preview still renders."""
    h = strip_fence(h)
    if "<" not in h: raise ValueError("The AI did not return a website. Press Retry build.")
    if "</html>" not in h.lower():
        cut = h.rfind(">"); h = h[:cut + 1] if cut > 0 else h
        low = h.lower()
        if low.rfind("<script") > low.rfind("</script>"): h += "</script>"
        if low.rfind("<style") > low.rfind("</style>"): h += "</style>"
        h += "</body></html>"
    if not re.search(r"<meta\b[^>]*charset\s*=", h, flags=re.I):
        if re.search(r"<head\b[^>]*>", h, flags=re.I):
            h = re.sub(r"(<head\b[^>]*>)", r'\1<meta charset="utf-8">', h, count=1, flags=re.I)
        else:
            h = re.sub(r"(<html\b[^>]*>)", r'\1<head><meta charset="utf-8"></head>', h, count=1, flags=re.I)
    return h


def _slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "project-section"


def _section_html(target, label, spec):
    key = re.sub(r"[^a-z0-9]+", " ", f"{target} {label}".lower()).strip()
    summary = escape(str(spec.get("summary") or "A purpose-built experience designed around this project."))
    features = [str(x) for x in spec.get("features", []) if isinstance(x, str)][:6]
    modules = [x for x in spec.get("modules", []) if isinstance(x, dict)][:5]
    milestones = [str(x) for x in spec.get("milestones", []) if isinstance(x, str)][:4]
    risks = [str(x) for x in spec.get("risks", []) if isinstance(x, str)][:3]
    styles = 'style="max-width:1200px;margin:0 auto;padding:clamp(24px,5vw,64px);color:inherit"'
    card = 'style="border:1px solid rgba(127,127,127,.28);border-radius:14px;padding:20px;background:rgba(127,127,127,.04);color:inherit"'
    if "feature" in key:
        title, items = "Features built for this project", features
        body = "".join(f"<article {card}><h3>{escape(x)}</h3><p>Included in the project requirements.</p></article>" for x in items)
        if not body:
            body = f"<article {card}><p>{summary}</p></article>"
        content = f'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">{body}</div>'
    elif "module" in key:
        title = "Project modules"
        body = "".join(
            f"<article {card}><h3>{escape(str(m.get('name', 'Project module')))}</h3>"
            f"<p>{escape(str(m.get('purpose', '')))}</p><p><strong>Technology:</strong> {escape(str(m.get('tech', 'To be confirmed')))}</p></article>"
            for m in modules
        )
        content = f'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">{body or f"<article {card}><p>{summary}</p></article>"}</div>'
    elif "analytic" in key or "insight" in key or "metric" in key:
        title = "Analytics & insights"
        notes = milestones or features[:3]
        body = "".join(f"<li>{escape(x)}</li>" for x in notes)
        risk = "".join(f"<li>{escape(x)}</li>" for x in risks)
        content = (
            f'<article {card}><p><strong>Illustrative preview only</strong> - No live data is connected.</p>'
            f'<p>{summary}</p><h3>Suggested measures</h3><ul>{body or "<li>Define project-specific measures with your team.</li>"}</ul>'
            f'<h3>Items to validate</h3><ul>{risk or "<li>Confirm data sources and measurement rules before production.</li>"}</ul></article>'
        )
    else:
        title = escape(label or "Project overview")
        body = "".join(f"<li>{escape(x)}</li>" for x in features[:4])
        content = f'<article {card}><p>{summary}</p><ul>{body}</ul></article>'
    return (
        f'<section id="{escape(target, quote=True)}" {styles}>'
        f'<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#667085">PROJECT PREVIEW</p>'
        f'<h2 style="font-size:clamp(26px,4vw,40px);margin:8px 0 20px">{title}</h2>{content}</section>'
    )


def repair_navigation(h, spec=None):
    """Make header navigation usable and add a real destination when its section is missing."""
    spec = spec if isinstance(spec, dict) else {}
    ids = set(re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']', h, flags=re.I))
    added = []
    nav_pattern = re.compile(r"<nav\b[^>]*>.*?</nav\s*>", flags=re.I | re.S)
    if nav_pattern.search(h):
        pattern = nav_pattern
    else:
        pattern = re.compile(r"<header\b[^>]*>.*?</header\s*>", flags=re.I | re.S)

    def update_nav(match):
        block = match.group(0)

        def link(match_link):
            opening, inner, closing = match_link.groups()
            label = unescape(re.sub(r"<[^>]*>", " ", inner))
            label = re.sub(r"\s+", " ", label).strip()
            if not label:
                return match_link.group(0)
            href = re.search(r'\bhref\s*=\s*(["\'])(.*?)\1', opening, flags=re.I)
            destination = href.group(2).strip() if href else ""
            parsed = urlsplit(destination)
            host = (parsed.hostname or "").lower()
            tavix_host = host == "tavixai.in" or host.endswith(".tavixai.in") or host == "tavix.in" or host.endswith(".tavix.in")
            local = not parsed.scheme and not parsed.netloc or tavix_host
            if href and not local:
                return match_link.group(0)
            if href and destination.startswith("#"):
                target = parsed.fragment
            elif href and (parsed.path in ("", "/")) and not parsed.fragment:
                attr = 'href="#"'
                opening = opening[:href.start()] + attr + opening[href.end():]
                return opening + inner + closing
            else:
                target = parsed.fragment or (parsed.path.rstrip("/").split("/")[-1] if parsed.path else "") or _slug(label)
            if not target or target not in ids:
                target = target or _slug(label)
                if target not in ids and target not in {item[0] for item in added}:
                    added.append((target, label))
            attr = f'href="#{escape(target, quote=True)}"'
            if href:
                opening = opening[:href.start()] + attr + opening[href.end():]
            else:
                opening = opening[:-1].rstrip() + f" {attr}>"
            return opening + inner + closing

        block = re.sub(r"(<a\b[^>]*>)(.*?)(</a\s*>)", link, block, flags=re.I | re.S)

        def button(button_match):
            opening, inner, closing = button_match.groups()
            label = unescape(re.sub(r"<[^>]*>", " ", inner))
            label = re.sub(r"\s+", " ", label).strip()
            if not label:
                return button_match.group(0)
            target = _slug(label)
            if target not in ids and target not in {item[0] for item in added}:
                added.append((target, label))
            target_attr = re.search(r'\bdata-tavix-nav-target\s*=\s*(["\']).*?\1', opening, flags=re.I)
            attr = f'data-tavix-nav-target="{escape(target, quote=True)}"'
            if target_attr:
                opening = opening[:target_attr.start()] + attr + opening[target_attr.end():]
            else:
                opening = opening[:-1].rstrip() + f" {attr}>"
            return opening + inner + closing

        return re.sub(r"(<button\b[^>]*>)(.*?)(</button\s*>)", button, block, flags=re.I | re.S)

    h = pattern.sub(update_nav, h)
    if added:
        sections = "".join(_section_html(target, label, spec) for target, label in added)
        if re.search(r"</body\s*>", h, flags=re.I):
            h = re.sub(r"</body\s*>", sections + "</body>", h, count=1, flags=re.I)
        else:
            h += sections
    if re.search(r'data-tavix-nav-target=', h, flags=re.I):
        script = """<script>
document.addEventListener("click", function (event) {
  const control = event.target.closest("[data-tavix-nav-target]");
  if (!control) return;
  const destination = document.getElementById(control.dataset.tavixNavTarget);
  if (!destination) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  destination.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}, true);
</script>"""
        if re.search(r"</body\s*>", h, flags=re.I):
            h = re.sub(r"</body\s*>", script + "</body>", h, count=1, flags=re.I)
        else:
            h += script
    return h


async def json_call(system, user, max_tokens, on_text=None, on_status=None):
    """Small models sometimes return broken JSON: stream the first try (shown live), retry once quietly."""
    for attempt in range(2):
        txt, prov = await llm.complete(system, user, max_tokens, on_text=on_text if attempt == 0 else None, on_status=on_status)
        try:
            return first_json(txt), prov
        except Exception:
            if attempt: raise ValueError("The AI returned a reply that is not valid JSON. Press Retry build.")


_sem = asyncio.Semaphore(1)  # one build at a time so a free/local model is not overloaded


async def build(bid: int, instruction: str = ""):
    async with _sem:
        await _build(bid, instruction)


LIVE_MAX = 60000


async def _build(bid: int, instruction: str = ""):
    db = SessionLocal(); b = db.get(Booking, bid); log = []
    if not b:
        return db.close()
    b.build_error = ""; b.build_live = ""; b.build_phase = "Reading your request"; b.build_started = datetime.utcnow()
    last = [0.0]

    def step(name, state):
        for e in log:
            if e["name"] == name:
                e["state"] = state
                if state in ("done", "failed") and "at" in e: e["secs"] = round((datetime.utcnow() - datetime.fromisoformat(e["at"])).total_seconds())
                break
        else:
            log.append({"name": name, "state": state, "at": datetime.utcnow().isoformat()})
        b.build_log = json.dumps(log); b.build_status = "building"; db.commit()

    def writer(force=False):
        """Streams what the AI is writing into the database about twice a second, so the client sees it live."""
        async def on_text(t):
            now = time.monotonic()
            if force or now - last[0] >= 0.5:
                last[0] = now; b.build_live = t[:LIVE_MAX]; db.commit()
        return on_text

    async def on_status(msg):
        b.build_phase = msg[:80]; db.commit()

    try:
        prev = f"\nPrevious spec:\n{b.spec}\nClient change request: {instruction}" if instruction and b.spec else ""
        brief = (f"Title: {b.title}\nSector: {b.sector}\nClient request: {b.problem}\nBudget: {b.budget or 'not given'}\n"
                 f"Website/product domain: {b.domain or 'infer from the request'}\n"
                 f"Requested visual theme: {b.theme or 'infer a distinctive theme from the product domain and audience'}{prev}")
        step("Understanding the requirements", "running"); b.build_phase = "Writing your requirements"; db.commit()
        spec, prov = await json_call(
            "You are Taviz AI, a senior solutions architect. Return ONLY JSON, no prose.",
            brief + '\n\nProduce JSON: {"summary":str,"features":[str],"modules":[{"name":str,"purpose":str,"tech":str}],'
                    '"compliance":[str],"data_entities":[str],"risks":[str],"milestones":[str]}. Be concrete and specific to this request. '
                    'Keep it compact: at most 6 features, 5 modules, 4 items in each other list. '
                    'For regulated topics list the real rule categories to check, and say the TAVIZ team must verify local law.', 2600,
            on_text=writer(), on_status=on_status)
        identity = compose_theme(b.domain, b.theme, b.sector, b.title, spec)
        spec["visual_identity"] = identity
        b.spec = json.dumps(spec); b.build_provider = prov; b.build_live = ""; step("Understanding the requirements", "done")

        step("Designing the website prototype", "running"); b.build_phase = "Designing your website"; db.commit()
        html, _ = await llm.complete(
            "You are Taviz AI, a front-end engineer. Return ONLY one complete self-contained HTML document, no commentary. "
            "Create a distinctive visual identity for this client's product and audience. Respect their requested theme and domain. "
            "Do not apply a generic TAVIZ red-and-black brand theme unless the client explicitly requested it. "
            "When the client has not chosen a theme, use the mandatory visual identity below, inferred from the product domain.",
            f"{brief}\n\nSpec:\n{json.dumps(spec)}\n\n{theme_prompt(identity)}\n\nBuild a working interactive prototype of this product: vanilla JS and inline CSS only, no external "
            f"requests except Google Fonts. Make it feel like a polished, production-quality product designed for its specific audience, "
            f"not a sparse landing page or generic dashboard. Include a clear hero with a useful call-to-action, product overview, "
            f"at least 4 substantial sections, 3 or more useful feature/module cards, and a well-spaced footer. "
            f"If this product benefits from analytics, include an accessible, clearly labelled sample chart and useful summary cards; "
            f"never imply sample metrics are live results. Use the actual project requirements to populate the content, not filler. "
            f"Navigation must use semantic links such as <a href=\"#overview\">Overview</a> whose targets are real section IDs; "
            f"every menu item must scroll to visible content and work on keyboard and touch. Buttons, tabs, and forms must respond when activated. "
            f"Keep the visual design specific to the client domain and requested theme, responsive, and accessible with visible focus states. "
            f"Use inline CSS/vanilla JS and clearly label demo data. Always finish with </html>. "
            f"Footer text: 'Prototype by Taviz AI'.", site_tokens(), on_text=writer(), on_status=on_status)
        b.site_html = inject_theme(repair_navigation(finish_html(html), spec), identity)
        b.build_live = b.site_html[:LIVE_MAX]; step("Designing the website prototype", "done")

        step("Mapping the 3D architecture", "running"); b.build_phase = "Mapping the 3D architecture"; b.build_live = ""; db.commit()
        try:
            sc, _ = await llm.complete("Return ONLY JSON, no prose.",
                f"Spec:\n{json.dumps(spec)}\n\nReturn {{\"nodes\":[{{\"id\":str,\"label\":str(max 3 words),\"layer\":one of {LAYERS}}}],\"edges\":[[id,id]]}} "
                "describing the system architecture with 6 to 14 nodes.", 1500, on_text=writer(), on_status=on_status)
            scene = first_json(sc)
            ids = {n["id"] for n in scene["nodes"]}
            scene["edges"] = [e for e in scene["edges"] if len(e) == 2 and e[0] in ids and e[1] in ids]
        except Exception:
            scene = fallback_scene(spec)
        b.scene = json.dumps(scene); step("Mapping the 3D architecture", "done")
        b.build_status = "ready"; b.build_phase = "Build complete"; b.build_live = ""; b.updated_at = datetime.utcnow(); b.reviewed = False
        if b.status == "placed": b.status = "reviewing"
        upsert_project(db, b)
    except Exception as e:
        print("build failed:", repr(e))
        b.build_error = f"{type(e).__name__}: {str(e)[:300]}"
        for x in log:
            if x["state"] == "running": x["state"] = "failed"
        b.build_log = json.dumps(log); b.build_status = "failed"; b.build_phase = "Build stopped"
    db.commit(); db.close()
