import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth.jsx";
export default function Navbar() {
  const { user, logout } = useAuth(); const nav = useNavigate(); const [open, setOpen] = useState(false);
  const links = [["Sectors", "/#sectors"], ["Projects", "/#projects"], ["Client feed", "/#feed"], ["Founder", "/#founder"], ["Book", "/#book"], ["XP & rewards", "/#playbook"], ["My missions", "/#client-missions"]];
  return (
    <header className="site-chrome fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-b border-black/10">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/"><img src="/logo.png" alt="TAVIX" className="h-10" /></Link>
        <nav className="hidden lg:flex gap-7 font-semibold">{links.map(([t, h]) => h.startsWith("/") && !h.startsWith("/#") ? <Link key={t} to={h} className="hover:text-tavix-red transition">{t}</Link> : <a key={t} href={h} className="hover:text-tavix-red transition">{t}</a>)}</nav>
        <div className="hidden lg:flex items-center gap-3">
          {user ? <>
            {user.role === "admin" ? <Link to="/admin" className="btn">Admin</Link> : <Link to="/chat" className="btn-o">TAVIX AI</Link>}
            <button onClick={() => { logout(); nav("/"); }} className="font-semibold hover:text-tavix-red">Log out</button>
          </> : <><Link to="/login" className="font-semibold hover:text-tavix-red">Log in</Link><Link to="/register" className="btn">Register</Link></>}
        </div>
        <button className="lg:hidden font-display text-xs" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? "CLOSE" : "MENU"}</button>
      </div>
      {open && <div className="lg:hidden bg-white border-t border-black/10 px-5 py-4 flex flex-col gap-4 font-semibold" onClick={() => setOpen(false)}>
        {links.map(([t, h]) => h.startsWith("/") && !h.startsWith("/#") ? <Link key={t} to={h}>{t}</Link> : <a key={t} href={h}>{t}</a>)}
        {user ? <><Link to={user.role === "admin" ? "/admin" : "/chat"}>{user.role === "admin" ? "Admin" : "TAVIX AI"}</Link><button className="text-left" onClick={logout}>Log out</button></>
          : <><Link to="/login">Log in</Link><Link to="/register">Register</Link></>}
      </div>}
    </header>
  );
}
