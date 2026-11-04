import { useEffect, useState } from "react";
import { api, getToken } from "../api";

export default function AdminTeach() {
  const [data, setData] = useState(null), [f, setF] = useState({ title: "", body: "" }), [q, setQ] = useState(""), [res, setRes] = useState(null), [err, setErr] = useState(""), [edit, setEdit] = useState(null);
  const load = () => api("/admin/knowledge").then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); setErr(""); try { await api("/admin/knowledge", { method: "POST", body: f }); setF({ title: "", body: "" }); load(); } catch (x) { setErr(x.message); } };
  const test = async (e) => { e.preventDefault(); setRes(await api("/admin/knowledge/test?q=" + encodeURIComponent(q))); };
  const save = async () => { await api("/admin/knowledge/" + edit.id, { method: "PUT", body: { title: edit.title, body: edit.body, active: edit.active } }); setEdit(null); load(); };
  const exportJsonl = async () => { const rows = await api("/admin/knowledge/export"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => JSON.stringify(r)).join("\n")], { type: "application/json" })); a.download = "tavix-company-qa.jsonl"; a.click(); };
  if (!data) return <p className="text-white/60">{err || "Loading…"}</p>;
  return (<div className="space-y-8">
    <section className="bg-white/5 p-5 cut-sm"><h3 className="text-xs">TEACH TAVIX AI SOMETHING NEW</h3>
      <p className="text-white/60 mt-2">Write a question or topic as the title and the correct answer as the text. Tavix AI uses it straight away in the chat at the bottom right. No redeploy needed. Good topics: new products, open roles, office details, offers, policies.</p>
      <form onSubmit={add} className="mt-4 space-y-3"><input required minLength={3} className="input" placeholder="Question or topic, e.g. Which roles are open this month?" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea required minLength={3} rows={4} className="input" placeholder="The answer, in clear words" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        {err && <p className="text-tavix-red" role="alert">{err}</p>}<button className="btn">Teach this</button></form></section>
    <section className="bg-white/5 p-5 cut-sm"><h3 className="text-xs">TEST WHAT IT KNOWS</h3>
      <form onSubmit={test} className="mt-3 flex gap-2 flex-wrap"><input className="input flex-1 min-w-[240px]" placeholder="Ask a question as a visitor would" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn">Test</button></form>
      {res && <div className="mt-4"><p className="whitespace-pre-wrap bg-black/40 p-4">{res.answer}</p><p className="text-sm text-white/50 mt-2">Matched: {res.matches.map((m) => `${m.title} (${m.score})`).join(" · ") || "nothing"}</p></div>}</section>
    <section><div className="flex items-center justify-between flex-wrap gap-2"><h3 className="text-xs">WHAT YOU TAUGHT ({data.custom.length})</h3><button className="btn-o !py-2" onClick={exportJsonl}>Export training file (.jsonl)</button></div>
      <p className="text-sm text-white/50 mt-1">The export holds every fact as a question and answer pair. Use it to train your own model on TAVIX facts.</p>
      <div className="mt-3 space-y-3">{data.custom.map((k) => <article key={k.id} className="bg-white/5 border border-white/15 p-4 cut-sm">
        {edit?.id === k.id ? <div className="space-y-2"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /><textarea rows={4} className="input" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          <label className="flex gap-2 items-center"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label><div className="flex gap-2"><button className="btn" onClick={save}>Save</button><button className="btn-o" onClick={() => setEdit(null)}>Cancel</button></div></div>
          : <><div className="flex justify-between gap-2"><h4 className="font-semibold">{k.title} {!k.active && <span className="text-xs text-amber-400">(off)</span>}</h4><div className="flex gap-3 text-sm"><button className="text-tavix-red" onClick={() => setEdit(k)}>Edit</button><button onClick={async () => { if (confirm("Delete this fact?")) { await api("/admin/knowledge/" + k.id, { method: "DELETE" }); load(); } }}>Delete</button></div></div><p className="text-white/75 mt-1 whitespace-pre-wrap">{k.body}</p></>}</article>)}
        {!data.custom.length && <p className="text-white/60">Nothing taught yet. Tavix AI already knows the built-in facts below.</p>}</div></section>
    <details className="bg-white/5 p-5 cut-sm"><summary className="cursor-pointer text-xs">BUILT-IN KNOWLEDGE ({data.built_in.length}) from backend/company_kb/*.md</summary>
      <div className="mt-3 space-y-2">{data.built_in.map((k, i) => <p key={i}><b>{k.title}</b><br /><span className="text-white/70">{k.body}</span></p>)}</div></details>
  </div>);
}
