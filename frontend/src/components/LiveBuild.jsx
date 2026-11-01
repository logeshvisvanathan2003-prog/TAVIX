import { useEffect, useRef, useState } from "react";
import { useReveal } from "./Markdown.jsx";
import { parseLog } from "./QuestMap.jsx";

const STEPS = [
  { n: "Understanding the requirements", label: "Requirements", exp: 1800 },
  { n: "Designing the website prototype", label: "Website", exp: 6500 },
  { n: "Mapping the 3D architecture", label: "3D architecture", exp: 900 },
];
const strs = (s) => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
const partial = (t) => ({
  summary: (t.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)/) || [])[1] || "",
  features: strs((t.match(/"features"\s*:\s*\[([^\]]*)/) || [])[1] || ""),
  modules: [...t.matchAll(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]),
});
const utc = (s) => (s ? new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z").getTime() : null);

// Phone-sized view of a page: render it wide, then scale it down to fit the pane.
function Scaled({ html, h = 300, wide = 1100 }) {
  const w = useRef(), [k, setK] = useState(0.4);
  useEffect(() => { const f = () => w.current && setK(w.current.clientWidth / wide); f(); const o = new ResizeObserver(f); w.current && o.observe(w.current); return () => o.disconnect(); }, []);
  return <div ref={w} className="relative bg-white overflow-hidden" style={{ height: h }}>
    <iframe title="Live preview" sandbox="" srcDoc={html} tabIndex={-1} className="absolute top-0 left-0 border-0 pointer-events-none bg-white" style={{ width: wide, height: h / k, transform: `scale(${k})`, transformOrigin: "top left" }} /></div>;
}

export default function LiveBuild({ b, title }) {
  const log = parseLog(b), live = b.build_live || "";
  const run = log.findIndex((x) => x.state === "running"), done = log.filter((x) => x.state === "done").length, cur = Math.min(2, run >= 0 ? run : done);
  const [now, setNow] = useState(Date.now()), [doc, setDoc] = useState(""), code = useRef();
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const started = utc(b.build_started), el = started ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
  const frac = run >= 0 ? Math.min(0.95, live.length / STEPS[cur].exp) : 0, pct = Math.min(99, Math.round(((done + frac) / 3) * 100));
  const n = useReveal(live, true, 420, 3), shown = live.slice(0, n).slice(-2400);
  useEffect(() => { if (code.current) code.current.scrollTop = code.current.scrollHeight; }, [shown]);
  useEffect(() => { if (cur === 1 && /<body|<h1|<div/i.test(live)) { const t = setTimeout(() => setDoc(live), 1200); return () => clearTimeout(t); } }, [cur === 1 ? Math.floor(live.length / 500) : -1]);
  const waiting = /busy|waiting|rate/i.test(b.build_phase || "");
  const p = cur === 0 ? partial(live) : null, nodes = cur === 2 ? [...live.matchAll(/"label"\s*:\s*"([^"]*)"/g)].map((m) => m[1]) : [];

  return (
    <div className="mt-4 bg-black text-white cut p-5 grid-bg" aria-live="polite">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="orb shrink-0" />
        <div className="flex-1 min-w-[200px]"><p className="font-display text-xs text-tavix-red">TAVIX AI IS BUILDING</p>
          <p className="text-lg leading-tight">“{title}”</p>
          <p key={b.build_phase} className="fade-up text-sm text-white/70">{b.build_status === "queued" ? "Waiting in the build queue…" : (b.build_phase || "Starting…")}</p></div>
        <div className="text-right"><p className="font-display text-2xl">{pct}%</p><p className="text-sm text-white/60">{String(Math.floor(el / 60)).padStart(2, "0")}:{String(el % 60).padStart(2, "0")} elapsed</p></div>
      </div>
      <div className="mt-3 h-1.5 bg-white/15 overflow-hidden"><div className="h-full bg-tavix-red transition-[width] duration-1000 relative" style={{ width: pct + "%" }}><span className="absolute inset-y-0 right-0 w-10 shimmer" /></div></div>
      {waiting && <p className="mt-3 text-sm text-amber-300 fade-up">The free AI service is busy. Tavix waits a few seconds and carries on automatically, nothing is lost.</p>}

      <ol className="mt-4 grid sm:grid-cols-3 gap-2">{STEPS.map((s, i) => { const e = log.find((x) => x.name === s.n), st = e?.state || "waiting"; return (
        <li key={s.n} className={"px-3 py-2 border cut-sm flex items-center gap-2 transition " + (st === "running" ? "border-tavix-red bg-tavix-red/10" : st === "done" ? "border-green-500/50" : "border-white/15 text-white/50")}>
          <span className="w-5 text-center">{st === "done" ? <span className="text-green-400">✔</span> : st === "running" ? <span className="inline-block w-3 h-3 bg-tavix-red animate-pulse" /> : "·"}</span>
          <span className="flex-1">{s.label}</span>{e?.secs != null && st === "done" && <span className="text-xs text-white/50">{e.secs}s</span>}</li>); })}</ol>

      <div className="mt-4 grid lg:grid-cols-2 gap-3">
        <div className="border border-white/15 bg-black/60 min-w-0"><p className="text-xs font-display px-3 py-2 border-b border-white/15 text-white/60">▍ WRITING LIVE</p>
          <pre ref={code} className="code-pane thin-scroll h-[300px] overflow-auto p-3 text-green-200/90 caret">{shown || "Getting ready…"}</pre></div>
        <div className="border border-white/15 bg-black/60 min-w-0"><p className="text-xs font-display px-3 py-2 border-b border-white/15 text-white/60">{cur === 0 ? "▍ YOUR REQUIREMENTS TAKE SHAPE" : cur === 1 ? "▍ LIVE PREVIEW" : "▍ ARCHITECTURE NODES"}</p>
          {cur === 0 && <div className="h-[300px] overflow-auto thin-scroll p-4 space-y-3">
            {p.summary ? <p className="text-lg fade-up">{p.summary}</p> : <div className="space-y-2">{[95, 80, 60].map((w, i) => <div key={i} className="h-3 shimmer" style={{ width: w + "%" }} />)}</div>}
            <ul className="space-y-1.5">{p.features.map((f, i) => <li key={i} className="fade-up flex gap-2"><span className="text-tavix-red">▸</span>{f}</li>)}</ul>
            <div className="flex flex-wrap gap-2">{p.modules.map((m, i) => <span key={i} className="fade-up px-2 py-1 text-sm bg-white/10 cut-sm">{m}</span>)}</div></div>}
          {cur === 1 && (doc ? <div className="relative"><span className="scanline" /><Scaled html={doc} /></div>
            : <div className="h-[300px] p-4 space-y-3">{[100, 40, 70, 55].map((w, i) => <div key={i} className="h-8 shimmer" style={{ width: w + "%" }} />)}<p className="text-sm text-white/60">Sketching the layout…</p></div>)}
          {cur === 2 && <div className="h-[300px] p-4 flex flex-wrap content-start gap-2 overflow-auto thin-scroll">{nodes.length ? nodes.map((x, i) => <span key={i} className="rise px-3 py-2 border border-tavix-red/60 bg-tavix-red/10 cut-sm floaty" style={{ animationDelay: (i % 5) * 120 + "ms" }}>{x}</span>)
            : <p className="text-white/60">Placing system components…</p>}</div>}
        </div>
      </div>
    </div>
  );
}
