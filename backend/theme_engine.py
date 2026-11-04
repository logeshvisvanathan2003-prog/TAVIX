"""Deterministic visual identity from the client's domain, requested theme, and brief."""
import colorsys
import hashlib
import re
from html import escape

COLOR_WORDS = {
    "navy": "#0f2744", "blue": "#2563eb", "ocean": "#0e7490", "teal": "#0f766e", "cyan": "#0891b2",
    "green": "#15803d", "forest": "#14532d", "mint": "#34d399", "olive": "#4d7c0f",
    "gold": "#ca8a04", "amber": "#d97706", "orange": "#ea580c", "coral": "#f97316",
    "red": "#b91c1c", "crimson": "#9f1239", "pink": "#db2777", "magenta": "#c026d3",
    "purple": "#7c3aed", "violet": "#6d28d9", "indigo": "#4338ca",
    "sand": "#d6bfa3", "cream": "#faf6ef", "ivory": "#fff7ed", "beige": "#e7dccb",
    "brown": "#7c4a2d", "charcoal": "#1f2937", "slate": "#334155", "black": "#111827",
    "white": "#f8fafc", "silver": "#cbd5e1", "warm": "#f5efe6", "cool": "#e8eef5",
}

DOMAIN_PRESETS = [
    (("health", "hospital", "clinic", "pharma", "medical", "patient", "care"),
     {"mood": "clinical calm", "layout": "wide cards, generous whitespace, trustworthy headers",
      "accent": "#0f766e", "accent2": "#115e59", "bg": "#f4fbf9", "ink": "#134e4a", "font": "Source Serif 4", "ui": "DM Sans"}),
    (("school", "educat", "student", "univers", "college", "attend", "classroom"),
     {"mood": "bright academic", "layout": "friendly hero, timetable blocks, rounded cards",
      "accent": "#2563eb", "accent2": "#1d4ed8", "bg": "#f8fbff", "ink": "#1e3a5f", "font": "Fraunces", "ui": "Nunito"}),
    (("marine", "ocean", "fleet", "port", "ship", "harbour", "harbor", "coast"),
     {"mood": "maritime", "layout": "horizon hero, chart well, deep contrast panels",
      "accent": "#0e7490", "accent2": "#155e75", "bg": "#f3fafb", "ink": "#164e63", "font": "Libre Baskerville", "ui": "Figtree"}),
    (("fashion", "apparel", "boutique", "clothing", "textile", "atelier"),
     {"mood": "editorial", "layout": "asymmetric hero, large type, lookbook grid",
      "accent": "#9f1239", "accent2": "#881337", "bg": "#fbf7f4", "ink": "#3f1d1d", "font": "Playfair Display", "ui": "Karla"}),
    (("finance", "bank", "fintech", "loan", "insur", "ledger", "payment"),
     {"mood": "precise finance", "layout": "dense metrics, tabular numbers, restrained chrome",
      "accent": "#1e3a8a", "accent2": "#0f172a", "bg": "#f6f7fb", "ink": "#0f172a", "font": "IBM Plex Serif", "ui": "IBM Plex Sans"}),
    (("food", "restaurant", "cafe", "hotel", "hospitality", "kitchen"),
     {"mood": "warm hospitality", "layout": "appetite photography blocks, menu cards, soft radii",
      "accent": "#c2410c", "accent2": "#9a3412", "bg": "#fff7ed", "ink": "#431407", "font": "Cormorant Garamond", "ui": "Outfit"}),
    (("agri", "farm", "crop", "soil", "harvest"),
     {"mood": "agrarian", "layout": "earthy bands, field metrics, practical tables",
      "accent": "#4d7c0f", "accent2": "#3f6212", "bg": "#f7fee7", "ink": "#1a2e05", "font": "Literata", "ui": "Manrope"}),
    (("legal", "law", "court", "compliance", "contract"),
     {"mood": "formal legal", "layout": "serif headings, numbered sections, conservative grid",
      "accent": "#44403c", "accent2": "#1c1917", "bg": "#fafaf9", "ink": "#1c1917", "font": "Source Serif 4", "ui": "Source Sans 3"}),
    (("energy", "solar", "green", "sustain", "climate"),
     {"mood": "clean energy", "layout": "light panels, progress rings, outdoor-inspired greens",
      "accent": "#059669", "accent2": "#047857", "bg": "#f0fdf4", "ink": "#052e16", "font": "Sora", "ui": "Sora"}),
    (("auto", "vehicle", "car", "telem", "fleet", "driver", "ecu"),
     {"mood": "industrial automotive", "layout": "instrument cluster, live tiles, technical captions",
      "accent": "#b45309", "accent2": "#111827", "bg": "#f7f7f5", "ink": "#111827", "font": "Barlow", "ui": "Barlow"}),
    (("logistics", "warehouse", "supply", "cargo", "freight"),
     {"mood": "logistics ops", "layout": "kanban lanes, status chips, high-density tables",
      "accent": "#0369a1", "accent2": "#0c4a6e", "bg": "#f8fafc", "ink": "#0f172a", "font": "Archivo", "ui": "Archivo"}),
    (("sport", "fitness", "gym", "wellness"),
     {"mood": "athletic", "layout": "bold numerals, streak bars, high-energy CTA",
      "accent": "#e11d48", "accent2": "#0f172a", "bg": "#fff1f2", "ink": "#111827", "font": "Oswald", "ui": "Inter"}),
    (("retail", "shop", "store", "ecommerce", "commerce"),
     {"mood": "retail catalog", "layout": "product grid, sticky cart cue, promotional ribbon",
      "accent": "#7c3aed", "accent2": "#5b21b6", "bg": "#faf5ff", "ink": "#2e1065", "font": "Poppins", "ui": "Poppins"}),
    (("iot", "embed", "sensor", "hardware", "industrial"),
     {"mood": "hardware lab", "layout": "schematic lines, telemetry chips, dark well for graphs",
      "accent": "#0d9488", "accent2": "#115e59", "bg": "#f8fafc", "ink": "#042f2e", "font": "Space Grotesk", "ui": "IBM Plex Sans"}),
]


def _hex(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    if len(h) != 6 or any(c not in "0123456789abcdefABCDEF" for c in h):
        return None
    return "#" + h.lower()


def _shift(hex_color, dh=0.0, ds=0.0, dl=0.0):
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    hh = (hh + dh) % 1.0
    ss = min(1.0, max(0.08, ss + ds))
    ll = min(0.92, max(0.08, ll + dl))
    r, g, b = colorsys.hls_to_rgb(hh, ll, ss)
    return "#{:02x}{:02x}{:02x}".format(round(r * 255), round(g * 255), round(b * 255))


def _digest(text):
    return hashlib.sha256((text or "tavix").encode("utf-8")).digest()


def _match_preset(blob):
    for keys, preset in DOMAIN_PRESETS:
        if any(k in blob for k in keys):
            return dict(preset)
    return {
        "mood": "modern product",
        "layout": "clear hero, feature grid, working in-page navigation",
        "accent": "#334155",
        "accent2": "#0f172a",
        "bg": "#f8fafc",
        "ink": "#0f172a",
        "font": "Fraunces",
        "ui": "Figtree",
    }


def compose_theme(domain="", theme="", sector="", title="", spec=None):
    spec = spec if isinstance(spec, dict) else {}
    blob = " ".join([
        domain or "", theme or "", sector or "", title or "",
        str(spec.get("summary") or ""),
        " ".join(str(x) for x in spec.get("features", [])[:4]),
    ]).lower()
    pack = _match_preset(blob)
    seed = _digest("|".join([domain or "", theme or "", title or "", sector or ""]))
    hue = seed[0] / 255.0 * 0.12 - 0.06
    sat = seed[1] / 255.0 * 0.08 - 0.03
    pack["accent"] = _shift(pack["accent"], dh=hue, ds=sat)
    pack["accent2"] = _shift(pack["accent2"], dh=hue * 0.5, dl=-0.04)
    found = [_hex(x) for x in re.findall(r"#(?:[0-9a-fA-F]{3}){1,2}", theme or "")]
    found = [x for x in found if x]
    for word, color in COLOR_WORDS.items():
        if re.search(rf"\b{word}\b", (theme or "").lower()):
            found.append(color)
    if found:
        pack["accent"] = found[0]
        pack["accent2"] = found[1] if len(found) > 1 else _shift(found[0], dl=-0.12)
        if len(found) > 2:
            pack["bg"] = found[2]
    asked = (theme or "").strip()
    pack.update({
        "domain": (domain or "").strip() or "inferred from the brief",
        "requested_theme": asked or "inferred from the domain",
        "allow_tavix_brand": bool(re.search(r"\btavix\b", blob)),
        "surface": _shift(pack["bg"], dl=0.03),
        "line": _shift(pack["ink"], dl=0.55, ds=-0.4),
        "name": f"{(domain or title or 'project').split(',')[0][:42]} identity",
    })
    return pack


def theme_prompt(pack):
    return (
        f"Visual identity (mandatory): mood '{pack['mood']}', layout '{pack['layout']}'. "
        f"Product domain: {pack['domain']}. Requested theme: {pack['requested_theme']}. "
        f"CSS colors: accent {pack['accent']}, secondary {pack['accent2']}, background {pack['bg']}, "
        f"text {pack['ink']}, surface {pack['surface']}. "
        f"Headings font '{pack['font']}', UI font '{pack['ui']}' from Google Fonts. "
        "Do not use TAVIZ red (#E10600) or a generic black-red motorsport look unless allow_tavix_brand is true. "
        f"allow_tavix_brand={pack['allow_tavix_brand']}. Every page of this prototype must look unique to this domain."
    )


def inject_theme(html, pack):
    """Force the chosen identity onto the finished HTML so free models cannot collapse to one brand."""
    fonts = escape(pack["font"]) + ":ital,wght@0,500;0,700;1,500&family=" + escape(pack["ui"]) + ":wght@400;600;700"
    css = f"""
@import url('https://fonts.googleapis.com/css2?family={fonts}&display=swap');
html,body{{height:auto!important;min-height:100%!important;overflow:auto!important;overflow-x:hidden!important;}}
:root{{--accent:{pack['accent']};--accent-2:{pack['accent2']};--bg:{pack['bg']};--ink:{pack['ink']};--surface:{pack['surface']};--line:{pack['line']};}}
html,body{{background:var(--bg)!important;color:var(--ink)!important;font-family:'{pack['ui']}',system-ui,sans-serif;}}
h1,h2,h3,h4{{font-family:'{pack['font']}',Georgia,serif;color:var(--ink);}}
a{{color:var(--accent-2);}}
button,.btn,input[type=submit]{{background:var(--accent);color:#fff;border:0;}}
header,nav{{background:var(--surface);border-bottom:1px solid var(--line);}}
"""
    if not pack.get("allow_tavix_brand"):
        html = re.sub(r"#e10600", pack["accent"], html, flags=re.I)
        html = re.sub(r"#8a0000", pack["accent2"], html, flags=re.I)
        html = re.sub(r"#111111|#111827|#000000", pack["ink"], html, flags=re.I)
    block = f'<style id="tavix-theme">{css}</style>'
    if re.search(r"</head\s*>", html, flags=re.I):
        html = re.sub(r"</head\s*>", block + "</head>", html, count=1, flags=re.I)
    else:
        html = block + html
    return html
