import { useEffect, useState } from "react";
import { api } from "../api";
const ST = ["new", "shortlisted", "rejected", "hired"];
export default function AdminCareers() {
  const [rows, setRows] = useState(null), [err, setErr] = useState("");
  const load = () => api("/admin/careers").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = async (id, status) => { await api("/admin/careers/" + id, { method: "PATCH", body: { status } }); load(); };
  if (err) return <p className="text-tavix-red">{err}</p>;
  if (!rows) return <p className="text-white/60">Loading…</p>;
  return (<div className="space-y-3"><p className="text-white/60">{rows.length} application{rows.length === 1 ? "" : "s"}</p>
    {rows.map((a) => <article key={a.id} className="bg-white/5 border border-white/15 p-4 cut-sm space-y-2">
      <div className="flex justify-between gap-2 flex-wrap"><h3 className="text-xs">{a.role}</h3><span className="text-sm text-white/50">{new Date(a.created_at).toLocaleString()}</span></div>
      <p className="font-semibold">{a.name} · <a className="text-tavix-red" href={"mailto:" + a.email}>{a.email}</a></p>
      {a.link && <a className="text-sm underline break-all" href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a>}
      {a.message && <p className="text-white/80 whitespace-pre-wrap">{a.message}</p>}
      <select className="input !w-auto" value={a.status} onChange={(e) => set(a.id, e.target.value)}>{ST.map((s) => <option key={s} className="text-black">{s}</option>)}</select></article>)}
    {!rows.length && <p className="text-white/60">No applications yet.</p>}</div>);
}
