import { useState } from "react";
import AnimLogo from "../components/AnimLogo.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
export default function AdminLogin() {
  const { adminLogin } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setErr(""); setBusy(true); try { await adminLogin(f); nav("/admin"); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <main className="min-h-screen bg-black text-white grid place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-md border border-tavix-red/60 p-8 cut space-y-4 animate-pop">
        <div className="mx-auto w-44 bg-white p-3"><AnimLogo rings /></div>
        <h1 className="text-sm text-center">COMMAND CENTRE · ADMIN LOGIN</h1>
        <input required type="email" className="input" placeholder="Admin email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input required type="password" className="input" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-tavix-red" role="alert">{err}</p>}
        <button disabled={busy} className="btn w-full">{busy ? "Checking…" : "Enter command centre"}</button>
        <p className="text-center text-sm text-white/50">Clients: use the normal <a className="text-tavix-red" href="/login">login</a>.</p>
      </form></main>
  );
}
