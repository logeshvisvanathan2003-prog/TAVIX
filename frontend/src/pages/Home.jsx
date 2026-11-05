import { useEffect, useRef, useState } from "react";
import AnimLogo from "../components/AnimLogo.jsx";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import Reveal from "../components/Reveal.jsx";
import Particles from "../components/Particles.jsx";
import { award, confetti } from "../gamify.js";
import { PRODUCTS, COMPANY, DELIVERED } from "../data/company.js";

export const SECTORS = [
  { n: "Web Development & Testing", d: "Dashboards, portals and APIs, with automated and manual testing built in.", k: "React · FastAPI · QA" },
  { n: "AI & ML Builds", d: "Predictive maintenance, vision and language models trained on your vehicle and fleet data.", k: "Python · PyTorch · MLOps" },
  { n: "Blockchain Technologies", d: "Tamper-proof service records, parts provenance and smart contracts.", k: "Solidity · Web3" },
  { n: "Automotive Software", d: "Telemetry, diagnostics, OTA update flows and fleet tools.", k: "CAN · MQTT · Cloud" },
  { n: "Hardware + Software (IoT/Embedded)", d: "Sensors and controllers paired with the software that makes them useful.", k: "ESP32 · C++ · Edge AI" },
];

function Counter({ to, suffix = "" }) {
  const [v, setV] = useState(0);
  useEffect(() => { let i = 0; const t = setInterval(() => { i++; setV(Math.round(to * Math.min(1, i / 30))); if (i >= 30) clearInterval(t); }, 40); return () => clearInterval(t); }, [to]);
  return <>{v}{suffix}</>;
}

function Hero({ projects, feedback }) {
  const done = projects.filter((p) => p.status === "completed" && !p.demo).length;
  const real = feedback.filter((f) => !f.demo);
  const avg = real.length ? (real.reduce((a, b) => a + b.rating, 0) / real.length).toFixed(1) : "–";
  return (
    <section className="relative min-h-screen pt-48 lg:pt-24 pb-16 flex items-center overflow-hidden tz-hero">
      <Particles /><span className="tz-orb a" aria-hidden="true" /><span className="tz-orb b" aria-hidden="true" /><span className="tz-scan" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-5 w-full grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="tz-eyebrow">TAVIZ AI TECHNOLOGIES SOLUTIONS</p>
          <h1 className="text-4xl sm:text-6xl leading-[1.08] tz-words">{"Software, hardware and AI that fix real problems.".split(" ").map((w, i) => <span key={i} style={{ "--i": i }} className={w === "AI" ? "w ai" : "w"}>{w} </span>)}</h1>
          <p className="mt-6 max-w-lg text-xl text-black/70">TAVIZ builds with web, ML, embedded systems and blockchain, and shows you every project, result and client review in the open. Innovation with honour.</p>
          <div className="mt-8 flex flex-wrap gap-4"><a href="#products" className="btn">Explore our products</a><a href="#portfolio" className="btn-o">See our work</a></div>
          <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[["Projects delivered", done], ["Client rating", avg], ["Sectors", SECTORS.length]].map(([l, v]) => (
              <div key={l} className="border-l-4 border-tavix-red pl-3"><dt className="text-sm text-black/60">{l}</dt><dd className="text-3xl font-light">{typeof v === "number" ? <Counter to={v} /> : v}</dd></div>))}
          </dl>
        </div>
        <div className="relative flex justify-center">
          <AnimLogo rings light className="w-full max-w-[560px]" />
        </div>
      </div>
    </section>
  );
}

function SectorCard({ s, i }) {
  const pick = () => { window.dispatchEvent(new CustomEvent("open-tavix-ai")); };
  const ref = useRef();
  const tilt = (e) => { const r = ref.current.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    ref.current.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`; };
  return (
    <Reveal delay={i * 80}>
      <div ref={ref} onPointerMove={tilt} onPointerLeave={() => (ref.current.style.transform = "")} className="area-card group h-full transition-transform duration-200">
        <span className="area-no">{String(i + 1).padStart(2, "0")}</span>
        <h3 className="area-t">{s.n}</h3>
        <p className="area-d">{s.d}</p>
        <ul className="area-tags">{s.k.split("·").map((t) => <li key={t}>{t.trim()}</li>)}</ul>
        <button onClick={pick} className="area-go">Ask Taviz AI about this <span aria-hidden="true">→</span></button>
      </div>
    </Reveal>
  );
}

const STATUS = { completed: "Delivered", ongoing: "In progress", upcoming: "Upcoming" };
const Stars = ({ n }) => <span className="text-tavix-red" aria-label={n + " out of 5"}>{"★".repeat(Math.round(n))}<span className="text-black/20">{"★".repeat(5 - Math.round(n))}</span></span>;

// Opening a project is a review gate: it cannot be closed until the client leaves feedback.
function ProjectModal({ p, onClose, onReviewed }) {
  const { user } = useAuth(); const [revs, setRevs] = useState([]); const [done, setDone] = useState(null); const [f, setF] = useState({ message: "", rating: 5, company: "" }); const [err, setErr] = useState("");
  const loadRevs = () => api("/feedback?project_id=" + p.id).then(setRevs).catch(() => {});
  useEffect(() => { loadRevs(); if (user) api("/feedback/mine").then((ids) => setDone(ids.includes(p.id))).catch(() => setDone(false)); }, []);
  const locked = !!user && done === false;
  const submit = async (e) => { e.preventDefault(); setErr(""); try { await api("/feedback", { method: "POST", body: { ...f, project_id: p.id } }); setDone(true); award("fb-" + p.id, 50, "Feedback shared"); loadRevs(); onReviewed(); } catch (x) { setErr(x.message); } };
  return (
    <div className="fixed inset-0 z-[55] bg-black/80 grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={p.title}>
      <div className="bg-white max-w-2xl w-full cut p-6 sm:p-8 my-8 animate-pop">
        <div className="flex justify-between gap-3"><h3 className="text-sm leading-relaxed">{p.title}</h3>
          <button onClick={onClose} disabled={locked} className="font-semibold disabled:opacity-30" aria-label="Close">{locked ? "🔒" : "✕"}</button></div>
        <p className="text-tavix-red font-semibold mt-1">{p.sector}{p.demo ? " · Sample" : ""}</p>
        <p className="mt-3">{p.summary}</p><p className="mt-2 text-sm font-semibold">{p.tech}</p>
        <div className="mt-4 bg-black text-white p-4 cut-sm"><p className="text-sm text-white/60">Result</p><p>{p.result || "The TAVIZ team has not published result notes for this project yet."}</p></div>
        <p className="mt-4 font-semibold">{p.review_count ? <><Stars n={p.avg_rating} /> {p.avg_rating} from {p.review_count} client review{p.review_count > 1 ? "s" : ""}</> : "No client reviews yet"}</p>
        <div className="mt-2 max-h-40 overflow-y-auto space-y-2">{revs.map((r) => <p key={r.id} className="border-l-4 border-tavix-red pl-3"><Stars n={r.rating} /> {r.message}<br /><span className="text-sm text-black/60">{r.author}{r.company ? `, ${r.company}` : ""}</span></p>)}</div>
        {!user && <p className="mt-6"><Link to="/login" className="btn">Log in to review</Link> <button onClick={onClose} className="ml-3 font-semibold">Close</button></p>}
        {locked && <form onSubmit={submit} className="mt-6 border-t-4 border-tavix-red pt-4 space-y-3">
          <p className="font-semibold">Feedback required: tell us what you think of this project before you continue.</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} aria-label={n + " stars"} onClick={() => setF({ ...f, rating: n })} className={"text-3xl hover:scale-125 transition " + (n <= f.rating ? "text-tavix-red" : "text-black/20")}>★</button>)}</div>
          <textarea required minLength={5} rows={3} className="input-l" placeholder="Your honest feedback" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <input className="input-l" placeholder="Company (optional)" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          {err && <p className="text-tavix-red" role="alert">{err}</p>}<button className="btn">Submit and unlock (+50 XP)</button></form>}
        {done && <p className="mt-4 text-sm font-semibold">Thanks, your feedback is now on the live client feed.</p>}
      </div></div>
  );
}

function Projects({ projects, reload }) {
  const [tab, setTab] = useState("completed"); const [sel, setSel] = useState(null);
  const all = [...DELIVERED.map((d) => ({ ...d, status: "completed", fixed: true })), ...projects];
  const list = all.filter((p) => p.status === tab);
  return (
    <section id="portfolio" className="py-24 bg-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><p className="font-display text-xs text-tavix-red">OUR WORK</p><h2 className="text-2xl sm:text-3xl mt-2">Projects by TAVIZ</h2><p className="mt-3 max-w-2xl text-black/70">What the TAVIZ team has delivered, and what is being built right now. Client missions appear here as Taviz AI builds them, and their progress and reviews update when a client rates the work.</p></Reveal>
      <div className="mt-8 flex gap-2 flex-wrap">{Object.entries(STATUS).map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={"px-5 py-2 font-semibold cut-sm " + (tab === k ? "bg-tavix-red text-white" : "bg-black/5 hover:bg-black/10")}>{v} ({all.filter((p) => p.status === k).length})</button>)}</div>
      <div key={tab} className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.length === 0 && <p className="text-black/60">Nothing in this stage yet.</p>}
        {list.map((p, i) => p.fixed ? <Reveal key={p.id} delay={i * 80}><article className="border border-black/15 p-6 cut h-full hover:border-tavix-red transition flex flex-col">
          <div className="flex justify-between gap-2 text-sm"><span className="text-tavix-red font-semibold">{p.sector}</span><span className="bg-green-600 text-white px-2">Live · {p.year}</span></div>
          <h3 className="mt-3 text-sm leading-relaxed">{p.title}</h3><p className="mt-2 text-black/70 flex-1">{p.summary}</p><p className="mt-2 text-sm font-semibold">{p.tech}</p>
          <div className="mt-4 h-2 bg-black/10"><div className="h-full bg-tavix-red" style={{ width: "100%" }} /></div>
          <div className="mt-1 text-sm">100% · delivered by TAVIZ</div>
          {p.url && p.url.includes(location.hostname) ? <span className="mt-4 self-start px-5 py-3 font-semibold bg-black/10 text-black/60 cut-sm">{p.cta}</span> : <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn mt-4 self-start magnetic">{p.cta}</a>}
        </article></Reveal> : <Reveal key={p.id} delay={i * 80}><article className="border border-black/15 p-6 cut h-full hover:border-tavix-red transition flex flex-col">
          <div className="flex justify-between gap-2 text-sm"><span className="text-tavix-red font-semibold">{p.sector}</span>{p.demo && <span className="bg-black text-white px-2">Sample</span>}</div>
          <h3 className="mt-3 text-sm leading-relaxed">{p.title}</h3><p className="mt-2 text-black/70 flex-1">{p.summary}</p><p className="mt-2 text-sm font-semibold">{p.tech}</p>
          <div className="mt-4 h-2 bg-black/10"><div className="h-full bg-tavix-red transition-all duration-1000" style={{ width: p.progress + "%" }} /></div>
          <div className="mt-1 flex justify-between gap-2 text-sm"><span>{p.progress}% · since {new Date(p.created_at).toLocaleDateString()}</span><span>{p.review_count ? <><Stars n={p.avg_rating} /> {p.review_count}</> : "No reviews"}</span></div>
          <button onClick={() => setSel(p)} className="btn mt-4 self-start magnetic">{p.status === "completed" ? "View result and review" : "View progress and review"}</button>
        </article></Reveal>)}
      </div>
      {sel && <ProjectModal p={sel} onClose={() => { setSel(null); reload(); }} onReviewed={reload} />}
    </div></section>
  );
}

function Feed({ feedback, reload, projects }) {
  const { user } = useAuth(); const [f, setF] = useState({ message: "", rating: 5, company: "" }); const [err, setErr] = useState("");
  const submit = async (e) => { e.preventDefault(); setErr(""); try { await api("/feedback", { method: "POST", body: f }); setF({ message: "", rating: 5, company: "" }); reload(); } catch (x) { setErr(x.message); } };
  const loop = feedback.length > 2 ? [...feedback, ...feedback] : feedback;
  return (
    <section id="feed" className="py-24 bg-black text-white"><div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12">
      <div>
        <Reveal><h2 className="text-2xl sm:text-3xl flex items-center gap-3"><span className="relative w-3 h-3 bg-tavix-red inline-block"><span className="absolute inset-0 bg-tavix-red animate-pulseRing" /></span>Live client feed</h2>
          <p className="mt-3 text-white/70 max-w-md">Reviews appear here as soon as clients post them. We do not edit or hide them.</p></Reveal>
        {user ? <form onSubmit={submit} className="mt-8 space-y-3 max-w-md">
          <textarea required minLength={5} className="input" rows={3} placeholder="How was working with TAVIZ?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <input className="input" placeholder="Company (optional)" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} aria-label={n + " stars"} onClick={() => setF({ ...f, rating: n })} className={"text-3xl transition hover:scale-125 " + (n <= f.rating ? "text-tavix-red" : "text-white/25")}>★</button>)}</div>
          {err && <p className="text-tavix-red" role="alert">{err}</p>}<button className="btn">Post feedback</button></form>
          : <p className="mt-8"><Link to="/login" className="underline text-tavix-red font-semibold">Log in</Link> to leave feedback.</p>}
      </div>
      <div className="relative h-[520px] overflow-hidden [mask-image:linear-gradient(transparent,#000_12%,#000_88%,transparent)] group">
        <div className={"space-y-4 " + (feedback.length > 2 ? "animate-feed group-hover:[animation-play-state:paused]" : "")}>
          {feedback.length === 0 && <p className="text-white/60">No feedback yet. Be the first to post.</p>}
          {loop.map((x, i) => <article key={i} className="bg-white/5 border border-white/15 p-5 cut-sm">
            <div className="text-tavix-red">{"★".repeat(x.rating)}<span className="text-white/20">{"★".repeat(5 - x.rating)}</span></div>
            <p className="mt-2">{x.message}</p><p className="mt-2 text-sm text-white/60">{x.author}{x.company ? `, ${x.company}` : ""}{x.project_id ? ` · on ${projects.find((q) => q.id === x.project_id)?.title || "a project"}` : ""}{x.demo ? " · Sample" : ""}</p></article>)}
        </div></div></div></section>
  );
}

function Booking() {
  const { user } = useAuth(); const nav = useNavigate(); const empty = { sector: SECTORS[0].n, title: "", problem: "", budget: "", language: "en", domain: "", theme: "" };
  const [f, setF] = useState(empty); const [done, setDone] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { const h = (e) => setF((x) => ({ ...x, sector: e.detail })); addEventListener("pick-sector", h); return () => removeEventListener("pick-sector", h); }, []);
  const [busy, setBusy] = useState(false);
  // Booking done -> straight to My missions, where the live build starts on screen. No approval step.
  const submit = async (e) => { e.preventDefault(); setErr(""); setBusy(true);
    try { const b = await api("/bookings", { method: "POST", body: f }); setDone(b.id); setF(empty); award("mission-" + b.id, 100, "Mission launched"); confetti(90); }
    catch (x) { setErr(x.message); setBusy(false); } };
  return (
    <section id="book" className="py-24 bg-tavix-red text-white"><div className="max-w-3xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">Launch a mission</h2><p className="mt-3 text-white/90">Describe the problem you need solved. Taviz AI reads every booking too, so you can ask it about yours in chat.</p></Reveal>
      {done ? <div className="mt-8 bg-black p-8 cut animate-pop"><h3 className="text-sm">Mission #{done} launched ★</h3><p className="mt-2">Taviz AI is already building it. The TAVIZ team will follow up with you.</p><div className="orb mt-4" /><Link to={`/?open=${done}#client-missions`} className="btn mt-4">Watch it now</Link></div>
        : !user ? <div className="mt-8 bg-black p-8 cut"><p>Log in to place a booking.</p><div className="mt-4 flex gap-3"><Link to="/login" className="btn">Log in</Link><Link to="/register" className="btn-o">Register</Link></div></div>
        : <form onSubmit={submit} className="mt-8 bg-black p-6 sm:p-8 cut space-y-4">
          <label className="block">Sector<select className="input mt-1" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })}>{SECTORS.map((s) => <option key={s.n} className="text-black">{s.n}</option>)}</select></label>
          <label className="block">Mission title<input required minLength={3} className="input mt-1" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="block">What problem do you need solved?<textarea required minLength={10} rows={5} className="input mt-1" value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} /></label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label>Product or website domain<input required minLength={3} className="input mt-1" maxLength={253} placeholder="e.g. marine fleet ops, school attendance, boutique fashion" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></label>
            <label>Visual theme or style<input className="input mt-1" maxLength={300} placeholder="e.g. ocean blue and sand, calm editorial serif, dark industrial amber" value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4"><label>Budget (optional)<input className="input mt-1" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></label>
            <label>Your language<input className="input mt-1" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></label></div>
          {err && <p role="alert">{err}</p>}<button className="btn" disabled={busy}>{busy ? "Launching…" : "Launch mission"}</button></form>}
    </div></section>
  );
}

export default function Home() {
  const [projects, setProjects] = useState([]), [feedback, setFeedback] = useState([]);
  const loadPr = () => api("/projects").then(setProjects).catch(() => {});
  const loadFb = () => api("/feedback").then(setFeedback).catch(() => {});
  useEffect(() => { loadPr(); loadFb(); const t = setInterval(() => { loadPr(); loadFb(); }, 15000); return () => clearInterval(t); }, []);
  return (<>
    <Hero projects={projects} feedback={feedback} />
    <section className="bg-black text-white overflow-hidden py-4 border-y border-tavix-red/40"><div className="marquee font-display text-xs">{[0, 1].map((k) => <div key={k} className="flex gap-12 pr-12 shrink-0">{["WEB & TESTING", "AI & ML", "BLOCKCHAIN", "AUTOMOTIVE SOFTWARE", "IOT & EMBEDDED", "INNOVATION WITH HONOUR"].map((t) => <span key={t + k} className="text-white/70">{t} <span className="text-tavix-red">◆</span></span>)}</div>)}</div></section>
    <section id="about" className="py-24 bg-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><p className="font-display text-xs text-tavix-red">ABOUT TAVIZ</p><h2 className="text-2xl sm:text-4xl mt-2 max-w-3xl">We turn real problems into working technology, in the open.</h2>
        <p className="mt-5 text-xl text-black/70 max-w-3xl">{COMPANY.legal} builds software, AI and hardware-plus-software products. We show every project, its progress, its result and the client's review, because honest work should be visible.</p></Reveal>
      <div className="mt-12 grid md:grid-cols-3 gap-6">{[["Our motive", "Turn real-world problems into working technology, and help learners become builders along the way."], ["What we do", "Web development and testing, AI and ML, blockchain, automotive software and IoT or embedded systems."], ["How we work", "Clear scope, open progress and real client feedback. That is what Innovation with Honour means."]].map(([t, d], i) => (
        <Reveal key={t} delay={i * 100}><div className="h-full border border-black/10 p-6 cut glow-card hover:-translate-y-1 hover:shadow-xl transition"><h3 className="text-sm text-tavix-red">{t}</h3><p className="mt-3 text-black/75">{d}</p></div></Reveal>))}</div></div></section>
    <section id="products" className="py-24 bg-black text-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><p className="font-display text-xs text-tavix-red">PRODUCTS</p><h2 className="text-2xl sm:text-4xl mt-2">Two names, two jobs.</h2><p className="mt-4 text-white/70 max-w-2xl">Here is how TAVIZ AI and ONE TAVIZ AI fit together, so you always know where to go.</p></Reveal>
      <div className="mt-10 grid lg:grid-cols-2 gap-6">
        <Reveal><div className="h-full bg-white/5 border border-white/15 p-7 cut"><span className="font-display text-[10px] bg-white text-black px-2 py-1">ON THIS WEBSITE</span><h3 className="text-lg mt-4">TAVIZ AI</h3>
          <p className="mt-3 text-white/75">Our assistant, the round button at the bottom right. Ask it about the company, the founder, careers and hiring, our products, or how to use this website and ONE TAVIZ AI.</p>
          <button className="btn mt-6" onClick={() => window.dispatchEvent(new CustomEvent("open-tavix-ai"))}>Ask TAVIZ AI</button></div></Reveal>
        {PRODUCTS.map((p) => <Reveal key={p.id} delay={120}><div className="h-full bg-tavix-red/10 border border-tavix-red p-7 cut relative overflow-hidden"><div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-tavix-red/15 to-transparent animate-scan pointer-events-none" />
          <span className="font-display text-[10px] bg-green-600 px-2 py-1 relative">{p.status.toUpperCase()} · {p.tag}</span><h3 className="text-lg mt-4 relative">{p.name}</h3><p className="mt-3 text-white/80 relative">{p.blurb}</p>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2 relative">{p.points.map((x) => <li key={x} className="text-sm text-white/80 flex gap-2"><span className="text-tavix-red">▸</span>{x}</li>)}</ul>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn mt-6 relative">Experience {p.name}</a></div></Reveal>)}</div></div></section>
    <section id="sectors" className="py-24 bg-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><p className="font-display text-xs text-tavix-red">WHAT WE BUILD</p><h2 className="text-2xl sm:text-3xl mt-2">Five areas of work</h2><p className="mt-3 max-w-2xl text-black/70">Every project we take on falls in one of these areas. Pick the closest one and Taviz AI shapes the plan around it.</p></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{SECTORS.map((s, i) => <SectorCard key={s.n} s={s} i={i} />)}
        <Reveal delay={SECTORS.length * 80}><div className="area-card area-cta h-full"><span className="area-no">+</span><h3 className="area-t">Something else?</h3><p className="area-d">Describe it in your own words. Taviz AI reads the request, picks the right area and will plan it with you.</p><button className="area-go" onClick={() => window.dispatchEvent(new CustomEvent("open-tavix-ai"))}>Ask TAVIZ AI <span aria-hidden="true">→</span></button></div></Reveal></div></div></section>
    <Projects projects={projects} reload={() => { loadPr(); loadFb(); }} />
    <Feed feedback={feedback} reload={loadFb} projects={projects} />
    <section id="founder" className="py-24 bg-white"><div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[auto,1fr] gap-10 items-center">
      <Reveal><div className="w-48 h-48 bg-black cut grid place-items-center relative overflow-hidden"><span className="font-display text-5xl text-tavix-red">LV</span><div className="absolute inset-0 bg-gradient-to-b from-transparent via-tavix-red/20 to-transparent animate-scan" /></div></Reveal>
      <Reveal delay={120}><p className="font-display text-xs text-tavix-red">FOUNDER</p><h2 className="text-2xl mt-1">Logesh Visvanathan</h2><p className="text-tavix-red font-semibold mt-1">Founder & CEO</p>
        <p className="mt-4 text-black/75 max-w-xl">Logesh started TAVIZ to take on real problems in the automobile industry, inspired by Tesla’s approach of joining hardware, software and AI. His rule for the company: innovation with honour, which means clear scope, open progress and real client feedback.</p></Reveal></div></section>
    <section className="py-20 bg-tavix-red text-white"><div className="max-w-5xl mx-auto px-5 text-center"><Reveal><h2 className="text-2xl sm:text-3xl">Want to build with us?</h2><p className="mt-3 text-white/90">See how we hire, what life at TAVIZ is like and which roles are open.</p><Link to="/careers" className="btn !bg-black mt-6">Explore careers</Link></Reveal></div></section>
    <footer id="contact" className="bg-black text-white py-12"><div className="max-w-7xl mx-auto px-5 grid md:grid-cols-3 gap-8">
      <div><div className="w-44"><AnimLogo light /></div><p className="mt-3 text-white/80 text-sm tracking-wide">TAVIZ AI TECHNOLOGIES SOLUTIONS</p><p className="font-display text-[10px] mt-2 text-tavix-red">INNOVATION WITH HONOUR</p></div>
      <div><h3 className="text-xs">EXPLORE</h3><ul className="mt-3 space-y-1 text-white/70"><li><a href="#about">About</a></li><li><a href="#products">Products</a></li><li><a href="#portfolio">Portfolio</a></li><li><Link to="/careers">Careers</Link></li></ul></div>
      <div><h3 className="text-xs">CONTACT</h3><p className="mt-3 text-white/70">FOUNDER &amp; CEO</p><p className="text-white/90 tracking-wide">LOGESH VISVANATHAN</p><p className="mt-2 text-white/70">MOBILE: <a className="text-tavix-red" href="tel:+916381975196">6381975196</a></p><p className="text-white/70">EMAIL: <a className="text-tavix-red" href="mailto:taviz.ai@gmail.com">taviz.ai@gmail.com</a></p></div></div></footer>
  </>);
}
