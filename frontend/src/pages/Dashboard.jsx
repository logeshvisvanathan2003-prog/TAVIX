import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { api, download } from "../api";
import { useAuth } from "../auth.jsx";
import Scene3D from "../components/Scene3D.jsx";
import LiveBuild from "../components/LiveBuild.jsx";
import QuestMap from "../components/QuestMap.jsx";
import { ClientTickets } from "../components/Tickets.jsx";
import { Typed } from "../components/Markdown.jsx";
import FullPreview, { withPreviewFix } from "../components/FullPreview.jsx";
import { award, availableXp, BADGES, confetti, HOW_XP, levelOf, rankProgress, RANKS, REWARDS, spend, unlocked, useGame } from "../gamify.js";
import ClientWorkspace from "../components/ClientWorkspace.jsx";

export function AiHealth() {
  const [h, setH] = useState(null);
  useEffect(() => { const l = () => api("/ai/health").then(setH).catch(() => setH({ online: false, backend: "?", detail: "The Tavix backend (port 8000) is not reachable." })); l(); const t = setInterval(l, 8000); return () => clearInterval(t); }, []);
  if (!h) return null;
  return <p role="status" className={"inline-block px-3 py-2 text-sm font-semibold cut-sm " + (h.online ? "bg-black text-white" : "border border-tavix-red text-tavix-red bg-white")}>
    <span className={"inline-block w-2 h-2 mr-2 " + (h.online ? "bg-green-400" : "bg-tavix-red animate-pulse")} />AI engine ({h.backend}): {h.online ? "online" : "OFFLINE"}. {h.detail}</p>;
}
export const STEPS = ["placed", "reviewing", "in_progress", "delivered"];
const DEVICES = [["100%", "Desktop"], ["768px", "Tablet"], ["390px", "Phone"]];

export { FullPreview };

export function Studio({ id, title, onTicket }) {
  const [b, setB] = useState(null), [tab, setTab] = useState("site"), [dev, setDev] = useState("100%"), [full, setFull] = useState(false), [fresh, setFresh] = useState(false);
  const [ins, setIns] = useState(""), [msg, setMsg] = useState(""), [exporting, setExporting] = useState(false), [polishing, setPolishing] = useState(false), prev = useRef(null);
  const load = () => api(`/bookings/${id}/build`).then(setB).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, [id]);
  const building = b && ["queued", "building"].includes(b.build_status);
  useEffect(() => { if (!building) return; const t = setInterval(load, 1000); return () => clearInterval(t); }, [building, id]);
  useEffect(() => {
    if (!b) return;
    if (prev.current && ["queued", "building"].includes(prev.current) && b.build_status === "ready") { setFresh(true); setTab("site"); confetti(); }
    prev.current = b.build_status;
  }, [b?.build_status]);
  if (!b) return <p className="py-4">{msg || "Loading Build Studio…"}</p>;
  const spec = b.spec ? JSON.parse(b.spec) : null, scene = b.scene ? JSON.parse(b.scene) : null, look = spec?.visual_identity;
  const revise = async () => { try { await api(`/bookings/${id}/revise`, { method: "POST", body: { instruction: ins } }); award("revise-first", 30, "Requested a change"); setIns(""); setMsg(""); setFresh(false); load(); } catch (e) { setMsg(e.message); } };
  const exportProject = async () => {
    setExporting(true); setMsg("");
    try {
      await download(`/bookings/${id}/download`, `${(title || "tavix-project").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`);
      award("export-" + id, 30, "Downloaded a project");
      confetti(80);
      setMsg("Your VS Code project ZIP is ready. +30 XP");
    }
    catch (e) { setMsg(e.message); }
    finally { setExporting(false); }
  };
  const polishPrototype = async () => {
    setPolishing(true); setMsg("");
    try {
      await api(`/bookings/${id}/revise`, {
        method: "POST",
        body: { instruction: "Professionally improve this existing prototype without changing the client's core requirements or chosen visual theme. Add substantial, specific, useful project content and a polished visual hierarchy. Make every visible navigation item link to a real section and work on mouse, keyboard, and touch. Add useful feature and module details from the requirements; any analytics or metrics must be clearly labelled sample data, never invented as real results. Ensure responsive layout, visible focus states, and working buttons." },
      });
      setB((current) => ({ ...current, build_status: "building" }));
      setFresh(false);
      setTab("site");
      setMsg("Improving the content and navigation. You can watch the updated build here.");
    } catch (e) { setMsg(e.message); }
    finally { setPolishing(false); }
  };
  const List = ({ t, a }) => a?.length ? <div className="mt-4"><h4 className="text-xs">{t}</h4><ul className="mt-2 list-disc pl-5 space-y-1">{a.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;
  return (
    <div className="mt-4 bg-white border-t-4 border-tavix-red pt-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="font-semibold">Tavix AI Build Studio {b.reviewed && b.build_status === "ready" ? <span className="ml-2 bg-black text-white text-sm px-2">Reviewed by TAVIX ✓</span> : b.build_status === "ready" ? <span className="ml-2 border border-black/30 text-sm px-2">AI build · ready to use</span> : null}</p>
        <button className="btn-o !py-2" onClick={() => dispatchEvent(new CustomEvent("open-tavix-ai", { detail: { mission: id } }))}>Ask Tavix AI about this</button>
      </div>
      {building && <LiveBuild b={b} title={title} />}
      {b.build_status === "failed" && <div className="mt-4 p-4 border border-tavix-red fade-up" role="alert"><p className="text-tavix-red">The build did not finish. The AI model may be offline or busy.</p>
        {b.build_error && <p className="text-sm mt-1 font-mono break-words">Reason: {b.build_error}</p>}
        <div className="flex gap-2 flex-wrap mt-3"><button className="btn" onClick={async () => { try { await api(`/bookings/${id}/retry`, { method: "POST" }); setMsg(""); load(); } catch (e) { setMsg(e.message); } }}>Retry build</button>
          {onTicket && <button className="btn-o" onClick={() => onTicket({ booking_id: id, category: "build", subject: `Build failed for “${title}”`, message: `My build for mission #${id} did not finish.\n\nReason shown: ${b.build_error || "unknown"}` })}>Raise a ticket</button>}</div></div>}
      {b.build_status === "ready" && <>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn download-ready" onClick={exportProject} disabled={exporting}>{exporting ? "Preparing ZIP…" : "Download VS Code project ZIP"}</button>
          <span className="text-sm text-black/60">Unzip and open the folder in VS Code: frontend, backend, docs, Docker files, and the live prototype.</span>
        </div>
        {fresh && <div className="mt-4 bg-tavix-red text-white p-4 cut-sm rise flex items-center gap-3 flex-wrap"><span className="font-display text-sm">★ BUILD COMPLETE</span><span className="flex-1">Your website, 3D map and requirements are ready.</span>
          <button className="btn !bg-black" onClick={() => setFull(true)}>⛶ Full screen preview</button></div>}
        {look && <div className="mt-4 p-4 border border-black/10 flex flex-wrap gap-3 items-center">
          <span className="font-display text-xs">THEME FROM YOUR DOMAIN</span>
          <span className="w-6 h-6 rounded-full border" style={{ background: look.accent }} />
          <span className="w-6 h-6 rounded-full border" style={{ background: look.accent2 }} />
          <span className="w-6 h-6 rounded-full border" style={{ background: look.bg }} />
          <span className="text-sm">{look.domain} · {look.mood} · {look.requested_theme}</span>
        </div>}
        {spec && <div className="mt-4 bg-black text-white p-5 cut"><p className="text-sm text-white/60">Tavix AI's response to your request</p>
          <div className="mt-1 text-lg"><Typed text={spec.summary || ""} live={fresh} /></div>
          {spec.features?.length > 0 && <ul className="mt-3 space-y-1">{spec.features.slice(0, 5).map((f, i) => <li key={i} className={fresh ? "fade-up" : ""} style={fresh ? { animationDelay: 700 + i * 220 + "ms" } : undefined}><span className="text-tavix-red">▸ </span>{f}</li>)}</ul>}
          <div className="mt-4 flex gap-2 flex-wrap"><button className="btn" onClick={() => setFull(true)}>⛶ Full screen preview</button><button className="btn-o" onClick={() => setTab("spec")}>Read requirements</button></div></div>}
        <div className="mt-4 flex gap-2 flex-wrap">{[["site", "Website"], ["3d", "3D view"], ["spec", "Requirements"], ["revise", "Request changes"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={"px-4 py-2 font-semibold cut-sm transition " + (tab === k ? "bg-tavix-red text-white" : "bg-black/5 hover:bg-black/10")}>{l}</button>)}</div>
        <div className="mt-4" key={tab}><div className="fade-up">
          {tab === "site" && <div>
            <div className="flex gap-2 mb-2 flex-wrap">{DEVICES.map(([w, l]) => <button key={w} onClick={() => setDev(w)} className={"px-3 py-1 border " + (dev === w ? "bg-black text-white" : "")}>{l}</button>)}<button className="btn-o !py-1.5 ml-auto" onClick={polishPrototype} disabled={polishing}>{polishing ? "Improving…" : "Improve content & navigation"}</button><button className="btn !py-1.5" onClick={() => setFull(true)}>⛶ Full screen preview</button></div>
            <div className={"bg-black/5 p-2 overflow-auto " + (unlocked("architect-lens") ? "architect-lens" : "")}><iframe title="Website prototype" sandbox="allow-scripts" srcDoc={withPreviewFix(b.site_html)} style={{ width: dev, maxWidth: "100%", height: 640 }} className="mx-auto block bg-white border" /></div></div>}
          {tab === "3d" && (scene ? <div className={unlocked("architect-lens") ? "architect-lens" : ""}><Scene3D scene={scene} /></div> : <p>No 3D view yet.</p>)}
          {tab === "spec" && spec && <div><p className="text-lg">{spec.summary}</p><List t="Features" a={spec.features} />
            {spec.modules?.length > 0 && <div className="mt-4 overflow-x-auto"><h4 className="text-xs">Modules</h4><table className="mt-2 w-full text-left"><tbody>{spec.modules.map((m, i) => <tr key={i} className="border-b"><td className="py-2 pr-3 font-semibold">{m.name}</td><td className="pr-3">{m.purpose}</td><td className="text-tavix-red">{m.tech}</td></tr>)}</tbody></table></div>}
            <List t="Compliance to check" a={spec.compliance} /><List t="Data entities" a={spec.data_entities} /><List t="Risks" a={spec.risks} /><List t="Milestones" a={spec.milestones} /></div>}
          {tab === "revise" && <div className="space-y-3"><p>Tell Tavix AI what to change. It rebuilds the requirements, website and 3D view, live.</p>
            <textarea className="input-l" rows={4} value={ins} onChange={(e) => setIns(e.target.value)} placeholder="e.g. Add a district-wise wastage map and a monthly compliance report" />
            <button className="btn" disabled={ins.trim().length < 5} onClick={revise}>Rebuild with changes</button></div>}
        </div></div></>}
      {full && b.site_html && <FullPreview html={b.site_html} title={title} onClose={() => setFull(false)} />}
      {msg && <p className="mt-2 text-tavix-red" role="alert">{msg}</p>}
      <p className="mt-4 text-sm text-black/50">Generated by Tavix AI as a prototype. Sample data only. A TAVIX engineer can review it before final delivery.</p>
    </div>
  );
}

export default function Dashboard({ embedded = false }) {
  const { user, ready } = useAuth(); const g = useGame(); const [sp] = useSearchParams();
  const [rows, setRows] = useState([]), [open, setOpen] = useState(parseInt(sp.get("open")) || null), [tab, setTab] = useState(sp.get("tab") === "tickets" ? "tickets" : "missions"), [unread, setUnread] = useState(0), [prefill, setPrefill] = useState(null);
  useEffect(() => { if (!user) return;
    const l = () => api("/bookings/mine").then((r) => { setRows(r); r.forEach((x) => award("mission-" + x.id, 100, "Mission #" + x.id + " launched"));
    });
    l(); const t = setInterval(l, 4000); return () => clearInterval(t); }, [user]);
  useEffect(() => { if (!user) return; const l = () => api("/tickets/mine").then((r) => setUnread(r.filter((t) => t.client_unread).length)).catch(() => {}); l(); const t = setInterval(l, 15000); return () => clearInterval(t); }, [user]);
  useEffect(() => { if (open && rows.length) setTimeout(() => document.getElementById("mission-" + open)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300); }, [open, rows.length > 0]);
  if (embedded && !user) return (
    <section id="client-missions" className="client-missions-embed py-10 sm:py-14">
      <main className="px-5 py-10 max-w-6xl mx-auto w-full text-center">
        <h1 className="text-2xl">My missions</h1>
        <p className="mt-3 text-black/70">Log in to view your missions, build progress, and support tickets.</p>
        <div className="mt-5 flex justify-center gap-3"><a href="/login" className="btn">Log in</a><a href="/register" className="btn-o">Register</a></div>
      </main>
    </section>
  );
  if (!embedded && ready && !user) return <Navigate to="/login" />;
  const lvl = levelOf(g.xp), toNext = 100 - (g.xp % 100), onTicket = (p) => { setPrefill(p); setTab("tickets"); };
  const selectWorkspaceItem = (missionId, workspaceTab) => {
    setTab(workspaceTab);
    if (missionId) setOpen(missionId);
  };
  const dashboardContent = (
    <main className={(embedded ? "embedded-dashboard " : "workspace-dashboard ") + "px-4 sm:px-7 py-7 sm:py-9 max-w-6xl mx-auto w-full"}>
      <h1 className="text-2xl">My missions</h1><p className="mt-2 text-black/70">Hello {user?.name}. Tavix AI starts building the moment you book, and you can watch every step live below.</p>
      <div className="mt-3"><AiHealth /></div>
      <section className={"mt-6 bg-black text-white p-5 cut " + (unlocked("gold-wing", g) ? "gold-wing" : "") + (unlocked("hud-pulse", g) ? " hud-pulse" : "")} aria-label="Your progress">
        <div className="flex justify-between flex-wrap gap-2 font-display text-xs"><span>LVL {lvl + 1} · {RANKS[lvl]}</span><span>{g.xp} XP · {availableXp(g)} unspent{lvl < RANKS.length - 1 ? ` · ${toNext} to ${RANKS[lvl + 1]}` : " · MAX RANK"}</span></div>
        <div className="mt-2 h-2 bg-white/20"><div className="h-full bg-tavix-red transition-all duration-700" style={{ width: rankProgress(g.xp) + "%" }} /></div>
        <div className="mt-4 flex gap-2 flex-wrap">{BADGES.map((x) => { const on = x.test(g, rows); return <span key={x.id} title={on ? x.name : x.hint} className={"px-3 py-1 cut-sm text-base transition " + (on ? "bg-tavix-red" : "bg-white/10 text-white/40")}>{on ? "★ " : "🔒 "}{x.name}</span>; })}</div>
        <div className="mt-5 grid md:grid-cols-2 gap-4 text-sm">
          <div><p className="font-display text-xs text-tavix-red">HOW YOU EARNED THIS</p><ul className="mt-2 space-y-1 text-white/75">{HOW_XP.slice(0, 4).map((row) => <li key={row.when}>+{row.xp} · {row.when}</li>)}</ul></div>
          <div><p className="font-display text-xs text-tavix-red">UNLOCK DASHBOARD UPGRADES</p>
            <div className="mt-2 flex flex-wrap gap-2">{REWARDS.map((item) => <button key={item.id} className="btn-o !py-1.5 !px-3" disabled={unlocked(item.id, g)} onClick={() => spend(item.id)}>{unlocked(item.id, g) ? item.name + " on" : item.name + " · " + item.cost}</button>)}</div></div>
        </div></section>
      <div className="mt-6 flex gap-2">{[["missions", "Missions"], ["tickets", "Support tickets" + (unread ? ` (${unread} new)` : "")]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={"px-5 py-2 font-semibold cut-sm " + (tab === k ? "bg-tavix-red text-white" : "bg-black/5 hover:bg-black/10")}>{l}</button>)}</div>
      {tab === "tickets" ? <div className="mt-5"><ClientTickets missions={rows} prefill={prefill} onChange={setUnread} focusTicketId={Number(sp.get("ticket")) || null} /></div> : <>
        {rows.length === 0 && <p className="mt-8">No missions yet. <a className="text-tavix-red font-semibold" href="/#book">Place your first booking.</a></p>}
        <div className="mt-6 space-y-6">{rows.map((b) => <article id={"mission-" + b.id} key={b.id} className="border border-black/15 p-6 cut rise scroll-mt-24">
          <div className="flex justify-between gap-3 flex-wrap"><h2 className="text-sm">#{b.id} {b.title}</h2><span className="text-sm text-tavix-red font-semibold">{b.sector}</span></div>
          <p className="mt-2 text-black/70">{b.problem}</p>
          {(b.domain || b.theme) && <p className="mt-2 text-sm text-black/60">Domain: {b.domain || "AI inferred"} · Theme: {b.theme || "AI inferred"}</p>}
          <QuestMap b={b} />
          <p className="mt-3 text-sm font-semibold">{b.status.replace("_", " ")} · AI build: {["queued", "building"].includes(b.build_status) ? <span className="text-tavix-red">{b.build_phase || "starting"}…</span> : b.build_status}{b.reviewed && b.build_status === "ready" ? " · reviewed by TAVIX ✓" : ""}</p>
          {b.solution && <div className="mt-3 bg-black text-white p-4 cut-sm"><p className="text-sm text-white/60">Message from the TAVIX team</p><p className="mt-1 whitespace-pre-wrap">{b.solution}</p></div>}
          <button className="btn mt-4" onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? "Close Build Studio" : ["queued", "building"].includes(b.build_status) ? "Watch the live build" : "Open Build Studio"}</button>
          {open === b.id && <Studio id={b.id} title={b.title} onTicket={onTicket} />}
        </article>)}</div></>}
    </main>
  );
  if (embedded) return <section id="client-missions" className="client-missions-embed py-10 sm:py-14">{dashboardContent}</section>;
  return <ClientWorkspace active={tab === "tickets" ? "support" : "missions"} title={tab === "tickets" ? "Support tickets" : "TAVIX AI"} subtitle={`Welcome back, ${user?.name || "client"}`} onMissionSelect={selectWorkspaceItem}>{dashboardContent}</ClientWorkspace>;
}
