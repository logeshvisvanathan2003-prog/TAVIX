import { useEffect, useRef, useState } from "react";

// Smooth reveal: text arrives in bursts, this releases it at a steady, readable pace
// (faster when far behind) instead of dumping it all at once.
export function useReveal(text, live, base = 70, k = 4, onTick) {
  const r = useRef({ f: live ? 0 : text.length, text, live });
  const [n, setN] = useState(r.current.f);
  r.current.text = text; r.current.live = live;
  useEffect(() => {
    if (!live && r.current.f >= text.length) { setN(text.length); return; }
    let raf, last = performance.now();
    const tick = (now) => {
      const s = r.current; if (s.f > s.text.length) s.f = s.text.length; const backlog = s.text.length - s.f, dt = Math.min(now - last, 100); last = now;
      if (backlog > 0) { s.f = Math.min(s.text.length, s.f + ((base + backlog * k) * dt) / 1000); setN(Math.floor(s.f)); onTick && onTick(); }
      if (backlog > 0 || s.live) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [live, text.length > 0]);
  return Math.min(n, text.length) || (live ? 0 : text.length);
}

const inline = (t) => t.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
  p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong>
  : p.startsWith("`") && p.endsWith("`") && p.length > 2 ? <code key={i}>{p.slice(1, -1)}</code> : p);

// Tiny safe markdown: paragraphs, bullets, numbered lists, **bold**, `code`. No raw HTML is ever injected.
export function Md({ text, className = "" }) {
  const blocks = []; let cur = null;
  text.split("\n").forEach((line) => {
    const b = line.match(/^\s*[-*•]\s+(.*)/), o = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (b || o) { const type = b ? "ul" : "ol"; if (!cur || cur.type !== type) { cur = { type, items: [] }; blocks.push(cur); } cur.items.push((b || o)[1]); }
    else if (line.trim()) { blocks.push({ type: "p", t: line }); cur = null; } else cur = null;
  });
  return <div className={"md " + className}>{blocks.map((b, i) => b.type === "p" ? <p key={i}>{inline(b.t)}</p>
    : b.type === "ul" ? <ul key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul> : <ol key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>)}</div>;
}

// Markdown text that types itself out while `live` is true (caret sits at the end of the last line).
export function Typed({ text, live, onTick, className = "" }) {
  const n = useReveal(text, live, 70, 4, onTick);
  const typing = live || n < text.length;
  return <Md text={text.slice(0, n) || (typing ? "\u200b" : "")} className={className + (typing ? " typing" : "")} />;
}
