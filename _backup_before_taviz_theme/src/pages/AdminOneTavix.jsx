import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";

const ago = (s) => { if (!s) return "never"; const m = Math.round((Date.now() - new Date(s)) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
const ICON = { login: "🔑", join: "👤", register: "👤", xp: "⭐" };
const Stat = ({ l, v, sub }) => <div className="border-l-4 border-tavix-red bg-white/5 p-4"><p className="text-sm text-white/60">{l}</p><p className="font-display text-xl mt-1">{v ?? "…"}</p>{sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}</div>;

export default function AdminOneTavix() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState("users"), [sum, setSum] = useState(null), [users, setUsers] = useState([]), [act, setAct] = useState([]), [q, setQ] = useState(""), [err, setErr] = useState(""), [at, setAt] = useState(null);
  const load = () => Promise.all([api("/admin/onetavix/summary"), api("/admin/onetavix/users"), api("/admin/onetavix/activity")])
    .then(([s, u, a]) => { setSum(s); setUsers(u); setAct(a); setErr(""); setAt(new Date()); }).catch((e) => setErr(e.message));
  useEffect(() => { if (user?.role === "admin") { load(); const t = setInterval(load, 10000); return () => clearInterval(t); } }, [user]);
  if (ready && user?.role !== "admin") return <Navigate to="/admin/login" />;
  const list = users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  const csv = () => { const h = ["name", "email", "joined", "logins", "last_login", "xp", "missions", "quests_done", "tower_best"]; const rows = [h, ...list.map((u) => h.map((k) => JSON.stringify(u[k] ?? "")))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" })); a.download = "one-tavix-ai-users.csv"; a.click(); };
  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-16"><div className="max-w-6xl mx-auto px-5">
      <div className="flex justify-between gap-3 flex-wrap items-center"><div><h1 className="text-xl">ONE TAVIZ AI · learners</h1><p className="text-white/60 mt-1">Registered users, sign-ins and activity on {" "}<a className="text-tavix-red underline" href="https://one.tavixai.in" target="_blank" rel="noopener noreferrer">one.tavixai.in</a>. Refreshes every 10 seconds{at ? ` · updated ${at.toLocaleTimeString()}` : ""}.</p></div>
        <Link to="/admin" className="btn-o">← Command centre</Link></div>
      {err && <p className="mt-5 bg-tavix-red/20 border border-tavix-red p-4" role="alert">{err}</p>}
      {sum && <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat l="Registered learners" v={sum.users} sub={`${sum.new_today} today · ${sum.new_week} this week`} /><Stat l="Active (24 h)" v={sum.active_24h} sub={`${sum.active_7d} in 7 days`} />
        <Stat l="Sign-ins" v={sum.logins_total} /><Stat l="Total XP" v={sum.xp_total} /><Stat l="Missions built" v={sum.missions} /><Stat l="Quests done" v={sum.quests_done} /><Stat l="Tower answers" v={sum.tower_answers} /><Stat l="Highest tower floor" v={sum.tower_best_floor} /></div>}
      <div className="mt-6 flex gap-2 flex-wrap">{[["users", "Learners"], ["activity", "Activity feed"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={"px-5 py-2 font-semibold cut-sm " + (tab === k ? "bg-tavix-red" : "bg-white/10 hover:bg-white/20")}>{l}</button>)}</div>
      {tab === "users" && <div className="mt-5 space-y-3">
        <div className="flex gap-3 items-center flex-wrap"><input className="input !w-auto min-w-[260px]" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="text-white/60">{list.length} learner{list.length === 1 ? "" : "s"}</span><button className="btn-o !py-2" onClick={csv}>Download CSV</button></div>
        <div className="overflow-x-auto"><table className="w-full text-left">
          <thead><tr className="text-xs text-white/50 font-display">{["Learner", "Email", "Joined", "Sign-ins", "Last sign-in", "XP", "Quests", "Missions", "Tower"].map((h) => <th key={h} className="py-2 pr-4 font-normal">{h}</th>)}</tr></thead>
          <tbody>{list.map((u) => <tr key={u.id} className="border-t border-white/10 hover:bg-white/5"><td className="py-3 pr-4 font-semibold">{u.name}</td><td className="pr-4 text-white/70">{u.email}</td><td className="pr-4">{new Date(u.joined).toLocaleDateString()}</td>
            <td className="pr-4">{u.logins}</td><td className="pr-4 text-white/60">{ago(u.last_login)}</td><td className="pr-4">{u.xp}</td><td className="pr-4">{u.quests_done}</td><td className="pr-4">{u.missions}</td><td className="pr-4">{u.tower_best || 0}</td></tr>)}</tbody></table>
          {!list.length && <p className="text-white/60 mt-4">No learners yet.</p>}</div></div>}
      {tab === "activity" && <ul className="mt-5 space-y-2 max-h-[560px] overflow-auto">{act.map((e, i) => <li key={i} className="flex gap-3 bg-white/5 p-3"><span>{ICON[e.type] || "•"}</span><span className="flex-1">{e.text} <span className="text-white/40 text-sm">({e.email})</span></span><span className="text-xs text-white/40 shrink-0">{ago(e.at)}</span></li>)}{!act.length && <p className="text-white/60">No activity yet.</p>}</ul>}
    </div></main>
  );
}
