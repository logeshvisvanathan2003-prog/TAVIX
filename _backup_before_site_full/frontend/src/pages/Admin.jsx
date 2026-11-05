import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { STEPS, Studio, AiHealth } from "./Dashboard.jsx";
import { AdminTickets } from "../components/Tickets.jsx";
import AdminCareers from "../components/AdminCareers.jsx";
import AdminTeach from "../components/AdminTeach.jsx";

function adminRequestMessage(error) {
  if (error.status === 401) return "Your admin session has expired. Sign in again to save this update.";
  if (error.status === 403 || error.message === "Admin only") return "The server rejected this admin session. Sign out and sign in again at the admin login page. If it still fails, ask the server operator to verify this account's admin role.";
  return error.message || "The update could not be saved. Please try again.";
}

function BookingRow({ b, reload }) {
  const [sol, setSol] = useState(b.solution), [st, setSt] = useState(b.status), [saved, setSaved] = useState(false), [rv, setRv] = useState(b.reviewed), [studio, setStudio] = useState(false), [edit, setEdit] = useState(false), [spec, setSpec] = useState(""), [html, setHtml] = useState(""), [em, setEm] = useState("");
  const save = async () => {
    setEm("");
    setSaved(false);
    try {
      await api("/admin/bookings/" + b.id, { method: "PATCH", body: { status: st, solution: sol, reviewed: rv } });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      reload();
    } catch (error) {
      setEm(adminRequestMessage(error));
    }
  };
  const publish = async () => {
    setEm("");
    try { await api(`/admin/bookings/${b.id}/publish`, { method: "POST" }); setEm("Project transparency updated. Real client reviews can now be collected."); reload(); }
    catch (e) { setEm(adminRequestMessage(e)); }
  };
  return (<article className="bg-white/5 border border-white/15 p-5 cut-sm space-y-3">
    <div className="flex justify-between gap-2 flex-wrap"><h3 className="text-xs">#{b.id} {b.title}</h3><span className="text-sm text-white/60">{b.source === "tavix-ai" ? "via Taviz AI" : "via form"} · {new Date(b.created_at).toLocaleString()}</span></div>
    <p className="text-sm text-tavix-red font-semibold">{b.client_name} ({b.client_email}) · {b.sector}{b.budget ? ` · ${b.budget}` : ""}</p>
    <p className="text-sm"><span className={"px-2 py-0.5 font-display text-[10px] " + (b.build_status === "ready" ? "bg-green-600" : b.build_status === "failed" ? "bg-tavix-red" : "bg-amber-500 text-black")}>AI build: {b.build_status}</span>{['queued', 'building'].includes(b.build_status) && <span className="ml-2 text-white/70">{b.build_phase}…</span>}</p>
    {(b.domain || b.theme) && <p className="text-sm text-white/70">Product domain: {b.domain || "inferred"} · Visual theme: {b.theme || "AI inferred"}</p>}
    <p className="text-white/80">{b.problem}</p>
    <select className="input" value={st} onChange={(e) => setSt(e.target.value)}>{STEPS.map((s) => <option key={s} className="text-black">{s}</option>)}</select>
    <textarea className="input" rows={3} placeholder="Solution given to the client" value={sol} onChange={(e) => setSol(e.target.value)} />
    <label className="flex items-center gap-2"><input type="checkbox" checked={rv} onChange={(e) => setRv(e.target.checked)} /> Engineer reviewed this AI build (required before publishing to Project Transparency)</label>
    <div className="flex gap-2 flex-wrap"><button onClick={save} className="btn">{saved ? "Saved ✓" : "Save update"}</button>
      <button className="btn-o" onClick={() => setStudio(!studio)}>{studio ? "Hide" : "Inspect"} AI build ({b.build_status})</button>
      <button className="btn-o" onClick={async () => { setEm(""); try { await api(`/admin/bookings/${b.id}/rebuild`, { method: "POST" }); reload(); } catch (error) { setEm(adminRequestMessage(error)); } }}>Rebuild</button></div>
    {b.build_status === "ready" && <button className="btn-o" onClick={publish}>Publish / update Project Transparency</button>}
    {em && <p className="text-sm text-amber-300" role="alert">{em}</p>}
    {studio && <div className="text-black"><Studio id={b.id} title={b.title} /></div>}
    <button className="btn-o" onClick={async () => { if (!edit) { setEm(""); try { const x = await api("/bookings/" + b.id + "/build"); setSpec(x.spec ? JSON.stringify(JSON.parse(x.spec), null, 2) : ""); setHtml(x.site_html || ""); } catch (error) { setEm(adminRequestMessage(error)); return; } } setEdit(!edit); }}>{edit ? "Close editor" : "Correct the AI build (training data)"}</button>
    {edit && <div className="space-y-2"><p className="text-sm text-white/60">Fix the requirements JSON and website HTML so they are exactly what you would deliver. Saving marks it reviewed. These corrected builds become your training data.</p>
      <textarea className="input font-mono text-sm" rows={10} value={spec} onChange={(e) => setSpec(e.target.value)} />
      <textarea className="input font-mono text-sm" rows={10} value={html} onChange={(e) => setHtml(e.target.value)} />
      {em && <p className="text-tavix-red" role="alert">{em}</p>}
      <button className="btn" onClick={async () => { setEm(""); try { await api("/admin/bookings/" + b.id, { method: "PATCH", body: { spec, site_html: html, reviewed: true } }); setRv(true); setEdit(false); reload(); } catch (e) { setEm(adminRequestMessage(e)); } }}>Save corrected build</button></div>}</article>
);
}

function ProjectEditor({ project, reload }) {
  const [form, setForm] = useState({
    title: project.title, sector: project.sector, summary: project.summary || "", tech: project.tech || "",
    client: project.client || "", status: project.status, progress: project.progress, result: project.result || "",
  });
  const [message, setMessage] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (e) => {
    e.preventDefault(); setMessage("");
    try {
      await api(`/admin/projects/${project.id}`, { method: "PATCH", body: { ...form, progress: +form.progress } });
      setMessage("Transparency record updated."); reload();
    } catch (error) { setMessage(error.message); }
  };
  return <form onSubmit={save} className="bg-white/5 border border-white/15 p-4 cut-sm grid sm:grid-cols-2 gap-3">
    <h3 className="sm:col-span-2 text-xs">{project.title} · {project.review_count || 0} real client reviews</h3>
    {["title", "sector", "tech", "client"].map((key) => <input key={key} required={key === "title"} className="input" placeholder={key} value={form[key]} onChange={(e) => update(key, e.target.value)} />)}
    <textarea className="input sm:col-span-2" placeholder="Public summary" value={form.summary} onChange={(e) => update("summary", e.target.value)} />
    <textarea className="input sm:col-span-2" placeholder="Public result" value={form.result} onChange={(e) => update("result", e.target.value)} />
    <select className="input" value={form.status} onChange={(e) => update("status", e.target.value)}>{["completed", "ongoing", "upcoming"].map((x) => <option key={x} className="text-black">{x}</option>)}</select>
    <label className="text-sm">Progress: {form.progress}%<input type="range" min="0" max="100" className="block w-full mt-2 accent-tavix-red" value={form.progress} onChange={(e) => update("progress", e.target.value)} /></label>
    {message && <p className="sm:col-span-2 text-sm text-green-300" role="status">{message}</p>}
    <button className="btn sm:col-span-2">Save transparency update</button>
  </form>;
}

const ago = (s) => { const m = Math.round((Date.now() - new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z")) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
const ICON = { signup: "👤", mission: "🚀", ticket: "🎫" };
const Stat = ({ l, v, hot, sub }) => <div className={"border-l-4 bg-white/5 p-4 " + (hot ? "border-amber-400" : "border-tavix-red")}><p className="text-sm text-white/60">{l}</p><p className="font-display text-xl mt-1">{v ?? "…"}</p>{sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}</div>;

function Overview({ data, reload, go }) {
  const s = data.stats, live = (data.bookings || []).filter((b) => ["queued", "building"].includes(b.build_status)), failed = (data.bookings || []).filter((b) => b.build_status === "failed");
  return (<div className="space-y-6">
    {s && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat l="Registered clients" v={s.users} sub={`${s.new_users_today} joined today`} /><Stat l="Missions" v={s.bookings} sub={`${s.new_bookings_today} launched today`} />
      <Stat l="Open tickets" v={s.tickets_open} hot={s.tickets_unread > 0} sub={s.tickets_unread ? `${s.tickets_unread} unread` : "all read"} /><Stat l="AI builds" v={`${s.builds.ready || 0} ready`} sub={`${(s.builds.building || 0) + (s.builds.queued || 0)} running · ${s.builds.failed || 0} failed`} />
      <Stat l="Booked by Taviz AI" v={s.ai_bookings} /><Stat l="AI messages" v={s.chats} /><Stat l="Reviews" v={s.feedback} /><Stat l="Delivered" v={s.by_status?.delivered || 0} /></div>}
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="bg-white/5 p-5 cut-sm"><h3 className="text-xs">LIVE BUILD MONITOR</h3>
        {live.length === 0 ? <p className="mt-3 text-white/60">No builds running right now.</p> : <ul className="mt-3 space-y-3">{live.map((b) => <li key={b.id} className="fade-up"><p className="font-semibold">#{b.id} {b.title} <span className="text-white/60 font-normal">· {b.client_name}</span></p>
          <p className="text-sm text-tavix-red">{b.build_phase || "queued"}…</p><div className="h-1 mt-1 bg-white/15 overflow-hidden"><div className="h-full w-1/3 bg-tavix-red" style={{ animation: "feedx 1.4s linear infinite" }} /></div></li>)}</ul>}
        <style>{"@keyframes feedx{from{margin-left:-33%}to{margin-left:100%}}"}</style>
        {failed.length > 0 && <div className="mt-5"><h3 className="text-xs text-tavix-red">FAILED BUILDS ({failed.length})</h3><ul className="mt-2 space-y-2">{failed.slice(0, 5).map((b) => <li key={b.id} className="flex items-center gap-2 flex-wrap"><span className="flex-1 min-w-[160px]">#{b.id} {b.title}<span className="block text-xs text-white/50 truncate">{b.build_error}</span></span>
          <button className="btn-o !py-1.5 !px-3" onClick={async () => { await api(`/admin/bookings/${b.id}/rebuild`, { method: "POST" }); reload(); }}>Rebuild</button></li>)}</ul></div>}</section>
      <section className="bg-white/5 p-5 cut-sm"><h3 className="text-xs">ACTIVITY FEED</h3><ul className="mt-3 space-y-2 max-h-[420px] overflow-auto thin-scroll">{(data.activity || []).map((e, i) => <li key={i} className="flex gap-3 slide-in"><span>{ICON[e.type]}</span><span className="flex-1">{e.text}</span><span className="text-xs text-white/40 shrink-0">{ago(e.at)}</span></li>)}</ul></section></div>
    <div className="flex gap-3 flex-wrap"><button className="btn" onClick={() => go("tickets")}>Open ticket inbox{s?.tickets_unread ? ` (${s.tickets_unread} unread)` : ""}</button><button className="btn-o" onClick={() => go("clients")}>View all registered clients</button></div></div>);
}

function Clients({ users, go }) {
  const [q, setQ] = useState(""), [open, setOpen] = useState(null), [det, setDet] = useState(null);
  const list = (users || []).filter((u) => u.role !== "admin" && (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  const show = async (u) => { if (open === u.id) return setOpen(null); setOpen(u.id); setDet(null); setDet(await api("/admin/users/" + u.id)); };
  return (<div className="space-y-3">
    <div className="flex gap-3 items-center flex-wrap"><input className="input !w-auto min-w-[260px]" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="text-white/60">{list.length} registered client{list.length === 1 ? "" : "s"}</span></div>
    <div className="overflow-x-auto"><table className="w-full text-left">
      <thead><tr className="text-xs text-white/50 font-display">{["Client", "Email", "Joined", "Missions", "Builds", "Tickets", "AI chats", "Last mission"].map((h) => <th key={h} className="py-2 pr-4 font-normal">{h}</th>)}</tr></thead>
      <tbody>{list.map((u) => <>
        <tr key={u.id} onClick={() => show(u)} className="border-t border-white/10 hover:bg-white/5 cursor-pointer"><td className="py-3 pr-4 font-semibold">{u.name}</td><td className="pr-4 text-white/70">{u.email}</td><td className="pr-4">{new Date(u.created_at).toLocaleDateString()}</td>
          <td className="pr-4">{u.missions}</td><td className="pr-4">{u.builds_ready}</td><td className="pr-4">{u.tickets}</td><td className="pr-4">{u.ai_messages}</td><td className="pr-4 text-white/60">{u.last_mission ? ago(u.last_mission) : "never"}</td></tr>
        {open === u.id && <tr key={u.id + "d"}><td colSpan={8} className="bg-white/5 p-4">{!det ? "Loading…" : <div className="grid md:grid-cols-2 gap-4">
          <div><h4 className="text-xs">MISSIONS</h4>{det.missions.length === 0 ? <p className="text-white/60 mt-2">None yet.</p> : <ul className="mt-2 space-y-1">{det.missions.map((m) => <li key={m.id}>#{m.id} {m.title} <span className="text-white/50">· {m.status} · build {m.build_status}</span></li>)}</ul>}</div>
          <div><h4 className="text-xs">TICKETS</h4>{det.tickets.length === 0 ? <p className="text-white/60 mt-2">None.</p> : <ul className="mt-2 space-y-1">{det.tickets.map((t) => <li key={t.id}>#{t.id} {t.subject} <span className="text-white/50">· {t.status}</span></li>)}</ul>}
            <button className="btn-o !py-1.5 mt-3" onClick={() => go("tickets")}>Go to tickets</button></div></div>}</td></tr>}</>)}</tbody></table></div></div>);
}

export default function Admin() {
  const { user, ready, logout } = useAuth(); const navigate = useNavigate(); const [tab, setTab] = useState("overview"); const [data, setData] = useState({}); const [q, setQ] = useState(""), [fs, setFs] = useState(""), [fb, setFb] = useState("");
  const [adminError, setAdminError] = useState("");
  const accessDenied = useRef(false);
  const [focusTicketId, setFocusTicketId] = useState(null), [newTicket, setNewTicket] = useState(null);
  const [pf, setPf] = useState({ title: "", sector: "Automotive Software", summary: "", tech: "", client: "", status: "ongoing", progress: 0, result: "" });
  const load = () => {
    if (accessDenied.current) return;
    return Promise.all([api("/admin/stats"), api("/admin/bookings"), api("/admin/users"), api("/admin/chats"), api("/admin/activity"), api("/projects"), api("/admin/tickets")]).then(([stats, bookings, users, chats, activity, projects, tickets]) => {
      setAdminError("");
      setData({ stats, bookings, users, chats, activity, projects, tickets });
      const newest = tickets.find((ticket) => ticket.admin_unread);
      if (newest) setNewTicket((current) => current?.id === newest.id ? current : newest);
    }).catch((error) => {
      if (error.status === 401 || error.status === 403) accessDenied.current = true;
      setAdminError(adminRequestMessage(error));
    });
  };
  useEffect(() => {
    accessDenied.current = false;
    if (user?.role !== "admin") return;
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [user]);
  if (ready && user?.role !== "admin") return <Navigate to="/admin/login" />;
  const s = data.stats;
  const ticketChanged = (tickets) => {
    setData((current) => ({ ...current, tickets }));
    const newest = tickets.find((ticket) => ticket.admin_unread);
    if (newest) setNewTicket((current) => current?.id === newest.id ? current : newest);
  };
  const addProject = async (e) => { e.preventDefault(); await api("/admin/projects", { method: "POST", body: { ...pf, progress: +pf.progress } }); setPf({ ...pf, title: "", summary: "", tech: "", client: "", result: "" }); await load(); };
  const bookings = (data.bookings || []).filter((b) => (!fs || b.status === fs) && (!fb || b.build_status === fb) && (b.title + b.client_name + b.client_email + b.problem).toLowerCase().includes(q.toLowerCase()));
  const TABS = [["overview", "Overview"], ["bookings", "Missions"], ["tickets", "Tickets" + (s?.tickets_unread ? ` (${s.tickets_unread})` : "")], ["clients", "Clients"], ["chats", "AI chats"], ["projects", "Projects"], ["careers", "Careers"], ["teach", "Teach Taviz AI"]];
  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-16"><div className="max-w-6xl mx-auto px-5">
      <div className="flex justify-between gap-3 flex-wrap items-center"><h1 className="text-xl">Command centre</h1><Link to="/admin/one-tavix" className="btn-o">ONE TAVIZ AI users →</Link></div><p className="text-white/60 mt-1">Signed in as {user?.name}. Live data, refreshed every 5 seconds. Client builds start automatically; you monitor, support and review.</p>
      {adminError && <div className="mt-4 border border-tavix-red bg-tavix-red/10 p-4 cut-sm" role="alert">
        <p className="font-semibold">{adminError}</p>
        {(accessDenied.current || user?.role !== "admin") && <button className="btn mt-3 !py-2" onClick={() => { logout(); navigate("/admin/login"); }}>Sign in again</button>}
      </div>}
      <div className="mt-3"><AiHealth /></div>
      <div className="mt-6 flex gap-2 flex-wrap">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={"px-5 py-2 font-semibold cut-sm " + (tab === k ? "bg-tavix-red" : "bg-white/10 hover:bg-white/20")}>{l}</button>)}</div>
      <div className="mt-6 space-y-4">
        {tab === "overview" && <Overview data={data} reload={load} go={setTab} />}
        {tab === "bookings" && <>
          <div className="flex gap-2 flex-wrap"><input className="input !w-auto min-w-[240px]" placeholder="Search client, title or problem…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input !w-auto" value={fs} onChange={(e) => setFs(e.target.value)}><option value="" className="text-black">All statuses</option>{STEPS.map((x) => <option key={x} className="text-black">{x}</option>)}</select>
            <select className="input !w-auto" value={fb} onChange={(e) => setFb(e.target.value)}><option value="" className="text-black">All builds</option>{["queued", "building", "ready", "failed"].map((x) => <option key={x} className="text-black">{x}</option>)}</select>
            <span className="self-center text-white/60">{bookings.length} shown</span></div>
          {bookings.length ? bookings.map((b) => <BookingRow key={b.id + b.updated_at + b.build_status} b={b} reload={load} />) : <p className="text-white/60">No missions match.</p>}</>}
        {newTicket && tab !== "tickets" && <button className="fixed bottom-5 left-5 z-40 bg-tavix-red text-white px-5 py-3 cut-sm shadow-xl" onClick={() => { setTab("tickets"); setFocusTicketId(newTicket.id); setNewTicket(null); }}>
          New client ticket #{newTicket.id} · {newTicket.subject} — Open inbox
        </button>}
        {tab === "tickets" && <AdminTickets users={data.users} onChange={ticketChanged} focusTicketId={focusTicketId} />}
        {tab === "careers" && <AdminCareers />}
        {tab === "teach" && <AdminTeach />}
        {tab === "clients" && <Clients users={data.users} go={setTab} />}
        {tab === "chats" && data.chats?.map((c) => <p key={c.id} className={"p-3 cut-sm " + (c.role === "user" ? "bg-tavix-red/20" : "bg-white/5")}><span className="text-xs text-white/50">{c.session_id.slice(0, 6)} · {c.role} · {new Date(c.created_at).toLocaleString()}</span><br />{c.content}</p>)}
        {tab === "projects" && <div className="space-y-4">
          <form onSubmit={addProject} className="grid sm:grid-cols-2 gap-3 bg-white/5 p-5 cut">
            {[["title", "Title"], ["sector", "Sector"], ["tech", "Tech stack"], ["client", "Client"], ["result", "Result achieved"]].map(([k, l]) => <input key={k} required={k === "title"} className="input" placeholder={l} value={pf[k]} onChange={(e) => setPf({ ...pf, [k]: e.target.value })} />)}
            <textarea className="input sm:col-span-2" placeholder="Summary" value={pf.summary} onChange={(e) => setPf({ ...pf, summary: e.target.value })} />
            <select className="input" value={pf.status} onChange={(e) => setPf({ ...pf, status: e.target.value })}>{["completed", "ongoing", "upcoming"].map((x) => <option key={x} className="text-black">{x}</option>)}</select>
            <input type="number" min="0" max="100" className="input" value={pf.progress} onChange={(e) => setPf({ ...pf, progress: e.target.value })} />
            <button className="btn sm:col-span-2">Publish project</button></form>
          <h2 className="text-xs mt-8">LIVE TRANSPARENCY RECORDS</h2>
          <p className="text-sm text-white/60">Ready AI builds appear on Project Transparency automatically. Use this tab to edit public copy, progress, and results. Client reviews stay real and are never invented.</p>
          {(data.projects || []).filter((p) => !p.demo).map((project) => <ProjectEditor key={project.id} project={project} reload={load} />)}
          <button className="btn-o" onClick={async () => { if (confirm("Remove all sample projects and feedback?")) { await api("/admin/demo", { method: "DELETE" }); await load(); } }}>Remove sample data</button></div>}
      </div></div></main>
  );
}
