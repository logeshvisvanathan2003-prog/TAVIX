import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import Reveal from "../components/Reveal.jsx";
import Particles from "../components/Particles.jsx";
import { award, confetti } from "../gamify.js";
import Playbook from "../components/Playbook.jsx";
import Dashboard from "./Dashboard.jsx";

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
    <section className="relative min-h-screen pt-48 lg:pt-24 pb-16 flex items-center overflow-hidden bg-white">
      <Particles />
      <div className="relative max-w-7xl mx-auto px-5 w-full grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-5xl leading-tight">Software, hardware and AI that fixes real automobile problems.</h1>
          <p className="mt-6 max-w-lg text-xl text-black/70">TAVIX builds with web, ML, embedded systems and blockchain, and shows you every project, result and client review in the open. Innovation with honour.</p>
          <div className="mt-8 flex flex-wrap gap-4"><a href="#book" className="btn">Start a mission</a><a href="#projects" className="btn-o">See our work</a></div>
          <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[["Projects delivered", done], ["Client rating", avg], ["Sectors", SECTORS.length]].map(([l, v]) => (
              <div key={l} className="border-l-4 border-tavix-red pl-3"><dt className="text-sm text-black/60">{l}</dt><dd className="font-display text-2xl">{typeof v === "number" ? <Counter to={v} /> : v}</dd></div>))}
          </dl>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="h-1/3 w-full bg-gradient-to-b from-transparent via-tavix-red/20 to-transparent animate-scan" /></div>
          <img src="/logo.png" alt="TAVIX wing logo" className="relative w-full max-w-xl animate-wingL" />
        </div>
      </div>
    </section>
  );
}

function SectorCard({ s, i }) {
  const ref = useRef(); const [open, setOpen] = useState(false);
  const tilt = (e) => { const r = ref.current.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    ref.current.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`; };
  const pick = () => { window.dispatchEvent(new CustomEvent("pick-sector", { detail: s.n })); document.getElementById("book").scrollIntoView(); };
  return (
    <Reveal delay={i * 80}>
      <div ref={ref} onPointerMove={tilt} onPointerLeave={() => (ref.current.style.transform = "")} className="bg-white text-black p-6 cut h-full transition-transform duration-200 flex flex-col">
        <h3 className="text-sm leading-relaxed">{s.n}</h3>
        <p className="mt-3 text-black/70 flex-1">{s.d}</p>
        <button onClick={() => setOpen(!open)} className="mt-4 text-left font-semibold text-tavix-red">{open ? "Hide tools" : "Inspect tools"}</button>
        <div className={"overflow-hidden transition-all duration-500 " + (open ? "max-h-24 mt-2" : "max-h-0")}><p className="font-semibold">{s.k}</p><button onClick={pick} className="mt-2 btn">Accept mission</button></div>
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
        <div className="mt-4 bg-black text-white p-4 cut-sm"><p className="text-sm text-white/60">Result</p><p>{p.result || "The TAVIX team has not published result notes for this project yet."}</p></div>
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
  const list = projects.filter((p) => p.status === tab);
  return (
    <section id="projects" className="py-24 bg-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">Project transparency</h2><p className="mt-3 max-w-2xl text-black/70">Live missions appear here as soon as Tavix AI finishes a build. Progress and reviews update when a client rates the work or the TAVIX team marks it delivered. Sample cards stay labelled Sample.</p></Reveal>
      <div className="mt-8 flex gap-2 flex-wrap">{Object.entries(STATUS).map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={"px-5 py-2 font-semibold cut-sm " + (tab === k ? "bg-tavix-red text-white" : "bg-black/5 hover:bg-black/10")}>{v} ({projects.filter((p) => p.status === k).length})</button>)}</div>
      <div key={tab} className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.length === 0 && <p className="text-black/60">Nothing in this stage yet.</p>}
        {list.map((p, i) => <Reveal key={p.id} delay={i * 80}><article className="border border-black/15 p-6 cut h-full hover:border-tavix-red transition flex flex-col">
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
        <Reveal><h2 className="text-2xl sm:text-3xl flex items-center gap-3"><span className="relative w-3 h-3 bg-tavix-red"><span className="absolute inset-0 bg-tavix-red animate-pulseRing" /></span>Live client feed</h2>
          <p className="mt-3 text-white/70 max-w-md">Reviews appear here as soon as clients post them. We do not edit or hide them.</p></Reveal>
        {user ? <form onSubmit={submit} className="mt-8 space-y-3 max-w-md">
          <textarea required minLength={5} className="input" rows={3} placeholder="How was working with TAVIX?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
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
    try { const b = await api("/bookings", { method: "POST", body: f }); setDone(b.id); setF(empty); award("mission-" + b.id, 100, "Mission launched"); confetti(90); setTimeout(() => nav(`/?open=${b.id}#client-missions`), 1400); }
    catch (x) { setErr(x.message); setBusy(false); } };
  return (
    <section id="book" className="py-24 bg-tavix-red text-white"><div className="max-w-3xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">Launch a mission</h2><p className="mt-3 text-white/90">Describe the problem you need solved. Tavix AI reads every booking too, so you can ask it about yours in chat.</p></Reveal>
      {done ? <div className="mt-8 bg-black p-8 cut animate-pop"><h3 className="text-sm">Mission #{done} launched ★</h3><p className="mt-2">Tavix AI is already building it. Taking you to My missions to watch it live…</p><div className="orb mt-4" /><Link to={`/?open=${done}#client-missions`} className="btn mt-4">Watch it now</Link></div>
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

export const ONE_TAVIX_URL = "https://one.tavixai.in";
function OneTavix() {
  const feats = [["Kingdom", "Learn by playing quests, earn XP and badges."], ["Endless Tower", "Climb floors of questions that adapt to you."], ["Build Track", "Turn any real problem into a working project."]];
  return (
    <section id="one-tavix" className="py-24 bg-white"><div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-[1.2fr,1fr] gap-10 items-center">
      <Reveal><p className="font-display text-xs text-tavix-red">NEW · FOR LEARNERS</p>
        <h2 className="text-2xl sm:text-3xl mt-2">Experience ONE TAVIX AI for Learners</h2>
        <p className="mt-4 text-black/75 max-w-xl">A gamified place to learn software by building. Describe a problem and get a complete project, then climb the Endless Tower and level up in the Kingdom. Free to join.</p>
        <div className="mt-6 flex gap-3 flex-wrap"><a href={ONE_TAVIX_URL} target="_blank" rel="noopener noreferrer" className="btn">Experience ONE TAVIX AI</a><a href={ONE_TAVIX_URL + "/register"} target="_blank" rel="noopener noreferrer" className="btn-o">Create free account</a></div></Reveal>
      <Reveal delay={120}><div className="grid gap-3">{feats.map(([t, d]) => <div key={t} className="bg-black text-white p-5 cut-sm border-l-4 border-tavix-red"><h3 className="text-xs">{t}</h3><p className="mt-1 text-white/70 text-sm">{d}</p></div>)}</div></Reveal>
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
    <OneTavix />
    <section id="sectors" className="py-24 bg-black text-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">Choose your sector</h2><p className="mt-3 text-white/70 max-w-xl">Each sector is a mission track. Pick one to see the tools we use and start a booking.</p></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{SECTORS.map((s, i) => <SectorCard key={s.n} s={s} i={i} />)}</div></div></section>
    <Projects projects={projects} reload={() => { loadPr(); loadFb(); }} />
    <Dashboard embedded />
    <Feed feedback={feedback} reload={loadFb} projects={projects} />
    <section id="founder" className="py-24 bg-white"><div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[auto,1fr] gap-10 items-center">
      <Reveal><div className="w-48 h-48 bg-black cut grid place-items-center"><span className="font-display text-5xl text-tavix-red">LV</span></div></Reveal>
      <Reveal delay={120}><h2 className="text-2xl">Logesh Visvanathan</h2><p className="text-tavix-red font-semibold mt-1">Founder & CEO</p>
        <p className="mt-4 text-black/75 max-w-xl">Logesh started TAVIX to take on real problems in the automobile industry, inspired by Tesla’s approach of joining hardware, software and AI. His rule for the company: innovation with honour, which means clear scope, open progress and real client feedback.</p></Reveal></div></section>
    <Booking />
    <Playbook />
    <footer className="bg-black text-white py-8 text-center"><p className="font-display text-xs">TAVIX · Innovation with Honour</p></footer>
  </>);
}
