import { useState } from "react";
import AnimLogo from "../components/AnimLogo.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Particles from "../components/Particles.jsx";
export default function Auth({ mode }) {
  const reg = mode === "register"; const { login, register } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setErr(""); setBusy(true);
    try { const u = reg ? await register(f) : await login({ email: f.email, password: f.password }); nav(u.role === "admin" ? "/admin" : "/chat"); }
    catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <main className="relative min-h-screen grid place-items-center px-5 pt-20 overflow-hidden"><Particles />
      <form onSubmit={submit} className="relative w-full max-w-md tz-panel text-white p-8 cut space-y-4 animate-pop">
        <div className="mx-auto w-48"><AnimLogo rings light /></div>
        <h1 className="text-sm text-center">{reg ? "Create your TAVIZ account" : "Log in to TAVIZ"}</h1>
        {reg && <input required className="input" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input required type="email" className="input" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input required type="password" minLength={reg ? 8 : 1} className="input" placeholder={reg ? "Password (8+ characters)" : "Password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-tavix-red" role="alert">{err}</p>}
        <button disabled={busy} className="btn w-full">{busy ? "Please wait…" : reg ? "Register" : "Log in"}</button>
        <p className="text-center text-white/70">{reg ? "Already registered?" : "New to TAVIZ?"} <Link className="text-tavix-red font-semibold" to={reg ? "/login" : "/register"}>{reg ? "Log in" : "Register"}</Link></p>
      </form></main>
  );
}
