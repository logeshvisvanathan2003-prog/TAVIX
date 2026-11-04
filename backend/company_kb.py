"""Company knowledge base for the TAVIZ AI chat: markdown files in company_kb/ plus entries the admin adds on the 'Teach Taviz AI' tab.
Small BM25 retriever. Used two ways: (1) the best chunks are put in the model prompt as facts, (2) when no model is available it answers from them directly."""
import math, re
from pathlib import Path

DIR = Path(__file__).parent / "company_kb"
STOP = set("a an the is are was were be to of in on at for and or do does did i you we it this that with my your me can how what who where when why which about tell please".split())
_cache = None


def _stem(w):
    for suf in ("ing", "ers", "ed", "er", "es", "s"):
        if len(w) > 4 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def toks(s):
    return [_stem(w) for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if w not in STOP and len(w) > 1]


WEAK = {"a", "an", "the", "is", "are", "do", "does", "i", "you", "we", "it", "my", "your", "me", "can", "to", "of", "in", "on", "at", "for", "and", "or"}


def _htoks(s):
    return {_stem(w) for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if w not in WEAK}


def _file_chunks():
    global _cache
    if _cache is None:
        out = []
        for f in sorted(DIR.glob("*.md")):
            if f.name.startswith((".", "_")):
                continue
            try:
                text = f.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for part in re.split(r"\n(?=## )", text):
                lines = part.strip().splitlines()
                if not lines:
                    continue
                head = lines[0].lstrip("# ").strip()
                body = "\n".join(lines[1:]).strip()
                if body:
                    out.append((head, body))
        _cache = out
    return _cache


def chunks(db=None):
    rows = list(_file_chunks())
    if db is not None:
        try:
            from models import KnowledgeEntry
            for e in db.query(KnowledgeEntry).filter_by(active=True).all():
                rows.append((e.title, e.body))
        except Exception:
            pass
    return rows


def search(query, db=None, k=3):
    docs = chunks(db)
    q = toks(query)
    if not q or not docs:
        return []
    tk = [toks(h + " " + h + " " + b) for h, b in docs]
    avg = sum(len(t) for t in tk) / len(tk) or 1
    n = len(docs)
    df = {}
    for t in tk:
        for w in set(t):
            df[w] = df.get(w, 0) + 1
    scored = []
    qh = _htoks(query)
    for (h, b), t in zip(docs, tk):
        hs = _htoks(h)
        s = 6.0 * len(qh & hs) / max(1, len(qh | hs))
        if s < 0.6:
            s = 0.0
        for w in set(q):
            f = t.count(w)
            if f:
                idf = math.log(1 + (n - df[w] + .5) / (df[w] + .5))
                s += idf * f * 2.2 / (f + 1.2 * (.25 + .75 * len(t) / avg))
        if s > 0.6:
            scored.append((s, h, b))
    scored.sort(reverse=True)
    return scored[:k]


def facts_block(query, db=None):
    hits = search(query, db, 3)
    if not hits:
        return ""
    return "\n\nTAVIX FACTS (answer from these; do not contradict them; if they do not cover the question, say the TAVIZ team can confirm):\n" + "\n".join(f"- {h}: {b}" for _, h, b in hits)


GREET = re.compile(r"^\s*(hi|hello|hey|hii|vanakkam|namaste|good (morning|afternoon|evening))\b", re.I)
MENU = ("I'm TAVIZ AI, the assistant of TAVIZ. Ask me about the company and founder, careers and how we hire, our products (ONE TAVIZ AI), "
        "or how to use the website.")


def offline_answer(query, db=None):
    if GREET.match(query or "") and len(toks(query)) <= 1:
        return "Hello! " + MENU
    hits = search(query, db, 2)
    if not hits or hits[0][0] < 1.2:
        return ("I don't have a confirmed answer for that yet, and I won't guess. " + MENU +
                " For anything else the TAVIZ team can confirm; use the contact details in the footer.")
    best = hits[0]
    text = f"**{best[1]}**\n{best[2]}"
    if len(hits) > 1 and hits[1][0] > best[0] * .75:
        text += f"\n\n**{hits[1][1]}**\n{hits[1][2]}"
    return text


def qa_pairs(db=None):
    """Heading -> body pairs for fine-tuning a model on the company facts (see ml/export_company_qa.py)."""
    return [(h, b) for h, b in chunks(db)]
