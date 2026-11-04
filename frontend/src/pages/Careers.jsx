import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Reveal from "../components/Reveal.jsx";
import Particles from "../components/Particles.jsx";
import { ROLES, HIRING, LIFE, COMPANY } from "../data/company.js";

function Apply({ role, onClose }) {
  const [f, setF] = useState({ name: "", email: "", link: "", message: "" }), [err, setErr] = useState(""), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setErr(""); setBusy(true);
    try { await api("/careers/apply", { method: "POST", body: { ...f, role: role.title } }); setDone(true); } catch (x) { setErr(x.message); } setBusy(false); };
  return (<div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 dd-panel" onClick={onClose}>
    <div className="bg-black text-white w-full max-w-lg p-6 cut max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between gap-3"><div><p className="font-display text-[10px] text-tavix-red">APPLY</p><h3 className="text-sm mt-1">{role.title}</h3></div><button onClick={onClose} aria-label="Close" className="text-2xl leading-none">×</button></div>
      {done ? <div className="mt-6 animate-pop"><p className="text-xl">Thank you, {f.name.split(" ")[0]}. Your application is with the team.</p><p className="text-white/60 mt-2">We read every application and will reply by email.</p><button className="btn mt-5" onClick={onClose}>Close</button></div>
        : <form onSubmit={submit} className="mt-4 space-y-3">
          <input required minLength={2} className="input" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required type="email" className="input" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className="input" placeholder="GitHub, portfolio or LinkedIn link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
          <textarea rows={4} className="input" placeholder="Tell us what you have built and why you want to join" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          {err && <p className="text-tavix-red" role="alert">{err}</p>}<button className="btn" disabled={busy}>{busy ? "Sending…" : "Send application"}</button></form>}
    </div></div>);
}

export default function Careers() {
  const [role, setRole] = useState(null);
  return (<main>
    <section className="relative pt-32 pb-20 bg-white overflow-hidden"><Particles /><div className="relative max-w-7xl mx-auto px-5">
      <p className="font-display text-xs text-tavix-red animate-pop">CAREERS AT TAVIZ</p>
      <h1 className="text-3xl sm:text-5xl mt-3 max-w-4xl leading-tight">Build things that matter, with people who care how they are built.</h1>
      <p className="mt-6 text-xl text-black/70 max-w-2xl">TAVIZ is a young company with real problems and an honest way of working. Here is what life is like, how we hire, and where you could fit.</p>
      <div className="mt-8 flex gap-4 flex-wrap"><a href="#roles" className="btn">See open roles</a><a href="#hiring" className="btn-o">How we hire</a></div></div></section>

    <section className="py-24 bg-black text-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">Life at TAVIZ</h2></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{LIFE.map(([t, d], i) => <Reveal key={t} delay={i * 90}><div className="h-full border-l-4 border-tavix-red bg-white/5 p-5 hover:-translate-y-1 transition"><h3 className="text-xs">{t}</h3><p className="mt-2 text-white/70">{d}</p></div></Reveal>)}</div></div></section>

    <section id="hiring" className="py-24 bg-white"><div className="max-w-4xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">How we hire</h2><p className="mt-3 text-black/70">Five steps. We care about what you can do, so most of it is practical.</p></Reveal>
      <ol className="mt-10 relative border-l-2 border-tavix-red/30 ml-4 space-y-8">{HIRING.map(([t, d], i) => <Reveal key={t} delay={i * 90}><li className="pl-8 relative"><span className="absolute -left-[17px] top-0 w-8 h-8 bg-tavix-red text-white grid place-items-center font-display text-xs cut-sm">{i + 1}</span><h3 className="text-sm">{t}</h3><p className="mt-1 text-black/70">{d}</p></li></Reveal>)}</ol></div></section>

    <section id="roles" className="py-24 bg-black text-white"><div className="max-w-7xl mx-auto px-5">
      <Reveal><h2 className="text-2xl sm:text-3xl">Roles</h2><p className="mt-3 text-white/70">Do not see an exact fit? Apply anyway and tell us what you would build.</p></Reveal>
      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">{ROLES.map((r, i) => <Reveal key={r.id} delay={(i % 3) * 90}><div className="h-full bg-white/5 border border-white/15 p-6 cut flex flex-col glow-card hover:-translate-y-1 transition">
        <p className="font-display text-[10px] text-tavix-red">{r.type.toUpperCase()}</p><h3 className="text-sm mt-2 leading-relaxed">{r.title}</h3><p className="mt-3 text-white/70 flex-1">{r.blurb}</p>
        <div className="mt-4 flex flex-wrap gap-2">{r.skills.map((s) => <span key={s} className="text-xs border border-white/25 px-2 py-1">{s}</span>)}</div>
        <button className="btn mt-5" onClick={() => setRole(r)}>Apply</button></div></Reveal>)}</div></div></section>

    <section className="py-20 bg-tavix-red text-white text-center"><div className="max-w-3xl mx-auto px-5"><Reveal><h2 className="text-2xl">Questions about working here?</h2><p className="mt-3">Ask TAVIZ AI at the bottom right, or write to <a className="underline" href={"mailto:" + COMPANY.email}>{COMPANY.email}</a>.</p><button className="btn !bg-black mt-6" onClick={() => window.dispatchEvent(new CustomEvent("open-tavix-ai"))}>Ask TAVIZ AI</button> <Link to="/" className="btn-o ml-3">Back to home</Link></Reveal></div></section>
    {role && <Apply role={role} onClose={() => setRole(null)} />}
  </main>);
}
