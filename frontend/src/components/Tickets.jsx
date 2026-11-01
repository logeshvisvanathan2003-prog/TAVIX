import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { award } from "../gamify.js";

const CATS = [["general", "General question"], ["build", "Problem with my AI build"], ["bug", "Something is broken"], ["feature", "Feature request"], ["billing", "Billing"]];
const PRIOS = ["low", "normal", "high", "urgent"], STAT = ["open", "in_progress", "resolved", "closed"];
const SCOL = { open: "bg-tavix-red", in_progress: "bg-amber-500 text-black", resolved: "bg-green-600", closed: "bg-white/25" };
const PCOL = { urgent: "text-tavix-red", high: "text-amber-300", normal: "text-white/70", low: "text-white/40" };
const label = (s) => s.replace("_", " ");
const when = (s) => { const m = Math.round((Date.now() - new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z")) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
export const Pill = ({ s }) => <span className={"px-2 py-0.5 text-xs font-display " + SCOL[s]}>{label(s)}</span>;

function Thread({ id, admin, onChange }) {
  const [t, setT] = useState(null), [msg, setMsg] = useState(""), [err, setErr] = useState(""), end = useRef();
  const load = () => api("/tickets/" + id).then((x) => { setT(x); onChange && onChange(); }).catch((e) => setErr(e.message));
  useEffect(() => { setT(null); load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [t?.messages?.length]);
  if (!t) return <p className="p-4 text-white/60">{err || "Loading ticket…"}</p>;
  const reply = async () => { try { await api(`/tickets/${id}/reply`, { method: "POST", body: { message: msg } }); setMsg(""); setErr(""); load(); } catch (e) { setErr(e.message); } };
  const patch = async (b) => { await api("/admin/tickets/" + id, { method: "PATCH", body: b }); load(); };
  return (<div className="flex flex-col h-full min-h-[420px]">
    <div className="p-4 border-b border-white/15 space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-xs flex-1">#{t.id} {t.subject}</h3><Pill s={t.status} /></div>
      <p className="text-sm text-white/60">{t.category} · <span className={PCOL[t.priority]}>{t.priority} priority</span>{t.booking_title ? ` · mission “${t.booking_title}”` : ""} · opened {when(t.created_at)}</p>
      {admin && <div className="flex gap-2 flex-wrap"><select className="input !py-2 !w-auto" value={t.status} onChange={(e) => patch({ status: e.target.value })}>{STAT.map((s) => <option key={s} className="text-black" value={s}>{label(s)}</option>)}</select>
        <select className="input !py-2 !w-auto" value={t.priority} onChange={(e) => patch({ priority: e.target.value })}>{PRIOS.map((s) => <option key={s} className="text-black">{s}</option>)}</select></div>}
    </div>
    <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-3 max-h-[420px]">
      {t.messages.map((m) => { const mine = admin ? m.author_role === "admin" : m.author_role === "client";
        return <div key={m.id} className={"fade-up flex " + (mine ? "justify-end" : "")}><div className={"max-w-[85%] px-4 py-2.5 cut-sm " + (mine ? "bg-tavix-red" : "bg-white/10")}>
          <p className="text-xs text-white/70 mb-0.5">{m.author_role === "admin" ? "TAVIX team" : m.author_name} · {when(m.created_at)}</p><p className="whitespace-pre-wrap">{m.body}</p></div></div>; })}
      <div ref={end} />
    </div>
    {t.status === "closed" ? <p className="p-4 text-white/60 border-t border-white/15">This ticket is closed.</p>
      : <div className="p-3 border-t border-white/15 space-y-2">{err && <p className="text-sm text-tavix-red" role="alert">{err}</p>}
        <div className="flex gap-2"><textarea rows={2} className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={admin ? "Reply to the client…" : "Write a reply…"} />
          <button className="btn !px-5" disabled={!msg.trim()} onClick={reply}>Send</button></div></div>}
  </div>);
}

function NewTicket({ missions, users, prefill, onCreated, onCancel }) {
  const [f, setF] = useState({ subject: prefill?.subject || "", message: prefill?.message || "", category: prefill?.category || "general", priority: "normal", booking_id: prefill?.booking_id || "", user_id: "" }), [err, setErr] = useState("");
  const submit = async (e) => { e.preventDefault(); setErr("");
    try { const body = { subject: f.subject, message: f.message, category: f.category, priority: f.priority, booking_id: f.booking_id ? +f.booking_id : null };
      const t = users ? await api("/admin/tickets", { method: "POST", body: { ...body, user_id: +f.user_id } }) : await api("/tickets", { method: "POST", body });
      if (!users) award("ticket-first", 30, "Raised a support ticket"); onCreated(t); } catch (x) { setErr(x.message); } };
  return (<form onSubmit={submit} className="p-4 space-y-3 fade-up">
    <h3 className="text-xs">{users ? "RAISE A TICKET FOR A CLIENT" : "RAISE A TICKET"}</h3>
    {users && <select required className="input" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}><option value="" className="text-black">Choose client…</option>{users.filter((u) => u.role !== "admin").map((u) => <option key={u.id} value={u.id} className="text-black">{u.name} ({u.email})</option>)}</select>}
    <input required minLength={3} className="input" placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
    <div className="grid sm:grid-cols-2 gap-3">
      <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map(([k, l]) => <option key={k} value={k} className="text-black">{l}</option>)}</select>
      <select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{PRIOS.map((p) => <option key={p} className="text-black">{p}</option>)}</select></div>
    {missions && <select className="input" value={f.booking_id} onChange={(e) => setF({ ...f, booking_id: e.target.value })}><option value="" className="text-black">Not about a specific mission</option>{missions.map((m) => <option key={m.id} value={m.id} className="text-black">#{m.id} {m.title}</option>)}</select>}
    <textarea required minLength={3} rows={5} className="input" placeholder="Describe the issue. What did you expect and what happened?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
    {err && <p className="text-tavix-red" role="alert">{err}</p>}
    <div className="flex gap-2"><button className="btn">Submit ticket</button><button type="button" className="btn-o" onClick={onCancel}>Cancel</button></div></form>);
}

function Shell({ list, sel, setSel, creating, setCreating, admin, filter, children, header }) {
  return (<div className="bg-black text-white cut grid md:grid-cols-[320px_1fr] min-h-[480px]">
    <div className="border-b md:border-b-0 md:border-r border-white/15 flex flex-col">
      <div className="p-3 space-y-2 border-b border-white/15">{header}<button className="btn !py-2 w-full" onClick={() => { setCreating(true); setSel(null); }}>+ {admin ? "Raise for a client" : "Raise a ticket"}</button></div>
      <div className="flex-1 overflow-y-auto thin-scroll max-h-[460px]">
        {list.length === 0 && <p className="p-4 text-white/60">{admin ? "No tickets match." : "No tickets yet. If something goes wrong, raise one and the TAVIX team will reply here."}</p>}
        {list.map((t) => { const unread = admin ? t.admin_unread : t.client_unread;
          return <button key={t.id} onClick={() => { setSel(t.id); setCreating(false); }} className={"w-full text-left p-3 border-b border-white/10 hover:bg-white/5 transition " + (sel === t.id ? "bg-tavix-red/20" : "")}>
            <div className="flex items-center gap-2"><span className="flex-1 truncate font-semibold">{unread && <span className="inline-block w-2 h-2 bg-tavix-red mr-2 animate-pulse" />}#{t.id} {t.subject}</span><Pill s={t.status} /></div>
            <p className="text-sm text-white/55 truncate">{admin ? t.client_name + " · " : ""}<span className={PCOL[t.priority]}>{t.priority}</span> · {t.preview}</p>
            <p className="text-xs text-white/40">{when(t.updated_at)}</p></button>; })}
      </div></div>
    <div className="min-w-0">{children}</div></div>);
}

export function ClientTickets({ missions, prefill, onChange, focusTicketId }) {
  const [list, setList] = useState([]), [sel, setSel] = useState(focusTicketId || null), [creating, setCreating] = useState(!!prefill);
  const load = () => api("/tickets/mine").then((r) => { setList(r); onChange && onChange(r.filter((t) => t.client_unread).length); });
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!focusTicketId) return; setSel(focusTicketId); setCreating(false); }, [focusTicketId]);
  return <Shell list={list} sel={sel} setSel={setSel} creating={creating} setCreating={setCreating}>
    {creating ? <NewTicket missions={missions} prefill={prefill} onCancel={() => setCreating(false)} onCreated={(t) => { setCreating(false); setSel(t.id); load(); }} />
      : sel ? <Thread id={sel} onChange={load} /> : <p className="p-6 text-white/60">Pick a ticket to see the conversation, or raise a new one.</p>}</Shell>;
}

export function AdminTickets({ users, onChange, focusTicketId }) {
  const [list, setList] = useState([]), [sel, setSel] = useState(focusTicketId || null), [creating, setCreating] = useState(false), [fl, setFl] = useState("");
  const load = () => api("/admin/tickets" + (fl ? "?status=" + fl : "")).then((r) => {
    setList(r);
    onChange && onChange(r);
    setSel((current) => current || r.find((ticket) => ticket.admin_unread)?.id || null);
  });
  useEffect(() => { load(); const i = setInterval(load, 2500); return () => clearInterval(i); }, [fl]);
  useEffect(() => { if (!focusTicketId) return; setSel(focusTicketId); setCreating(false); }, [focusTicketId]);
  return <Shell admin list={list} sel={sel} setSel={setSel} creating={creating} setCreating={setCreating}
    header={<div className="flex gap-1 flex-wrap">{["", ...STAT].map((s) => <button key={s} onClick={() => setFl(s)} className={"px-2 py-1 text-xs border " + (fl === s ? "bg-tavix-red border-tavix-red" : "border-white/25")}>{s ? label(s) : "all"}</button>)}</div>}>
    {creating ? <NewTicket users={users} onCancel={() => setCreating(false)} onCreated={(t) => { setCreating(false); setSel(t.id); load(); }} />
      : sel ? <Thread id={sel} admin onChange={load} /> : <p className="p-6 text-white/60">Select a ticket to read and reply. Unread tickets show a red dot.</p>}</Shell>;
}
