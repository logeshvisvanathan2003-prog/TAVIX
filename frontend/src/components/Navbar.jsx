import { Link, useLocation, useNavigate } from "react-router-dom";
import AnimLogo from "./AnimLogo.jsx";
import { useEffect, useRef, useState } from "react";
import { PRODUCTS } from "../data/company.js";
import { useAuth } from "../auth.jsx";

export default function Navbar() {
  const { user, logout } = useAuth(); const nav = useNavigate();
  const [open, setOpen] = useState(false), [dd, setDd] = useState(false), [scrolled, setScrolled] = useState(false); const ref = useRef(); const { pathname } = useLocation();
  useEffect(() => { const s = () => setScrolled(scrollY > 8); s(); addEventListener("scroll", s); return () => removeEventListener("scroll", s); }, []);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setDd(false); }; addEventListener("pointerdown", h); return () => removeEventListener("pointerdown", h); }, []);
  useEffect(() => { setOpen(false); setDd(false); }, [pathname]);
  const cls = "relative font-semibold hover:text-tavix-red transition after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-tavix-red hover:after:w-full after:transition-all";
  return (
    <header className={"site-chrome fixed top-0 inset-x-0 z-40 backdrop-blur border-b transition-all " + (scrolled ? "bg-white/95 border-black/10 shadow-sm" : "bg-white/80 border-transparent")}>
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" aria-label="TAVIX home" className="block w-[88px]"><AnimLogo /></Link>
        <nav className="hidden lg:flex items-center gap-8">
          <Link to="/" className={cls}>Home</Link>
          <a href="/#about" className={cls}>About</a>
          <div className="relative" ref={ref} onMouseEnter={() => setDd(true)} onMouseLeave={() => setDd(false)}>
            <button className={cls + " flex items-center gap-1"} aria-expanded={dd} onClick={() => setDd(!dd)}>Products <span className={"inline-block text-xs transition-transform " + (dd ? "rotate-180" : "")}>▼</span></button>
            {dd && <div className="dd-panel absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[380px]"><div className="bg-black text-white p-4 cut shadow-2xl">
              <p className="font-display text-[10px] text-white/50 px-2">AVAILABLE NOW</p>
              {PRODUCTS.map((p, i) => <a key={p.id} href={p.url} target={p.external ? "_blank" : undefined} rel="noopener noreferrer" style={{ animationDelay: i * 80 + 80 + "ms" }} className="dd-item mt-2 block p-3 border-l-4 border-tavix-red bg-white/5 hover:bg-tavix-red/20 transition group">
                <div className="flex items-center justify-between"><span className="font-display text-xs">{p.name}</span><span className="text-[10px] font-display bg-green-600 px-2 py-0.5">{p.status}</span></div>
                <p className="text-sm text-white/70 mt-1">{p.blurb}</p><p className="text-tavix-red text-sm mt-2 group-hover:translate-x-1 transition">Open {p.name} →</p></a>)}
              <p className="mt-3 px-2 text-xs text-white/40">More products will appear here as they are completed.</p>
            </div></div>}
          </div>
          <a href="/#portfolio" className={cls}>Portfolio</a>
          <Link to="/careers" className={cls}>Careers</Link>
          <a href="/#contact" className={cls}>Contact</a>
          {user && <a href="/#client-missions" className={cls}>My missions</a>}
        </nav>
        <div className="hidden lg:flex items-center gap-3"><button onClick={() => window.dispatchEvent(new CustomEvent("open-tavix-ai"))} className="btn-o">Ask TAVIX AI</button>
          {user ? <>{user.role === "admin" ? <Link to="/admin" className="btn">Admin</Link> : <Link to="/chat" className="btn">TAVIX AI page</Link>}<button onClick={() => { logout(); nav("/"); }} className="font-semibold hover:text-tavix-red">Log out</button></>
            : <><Link to="/login" className="font-semibold hover:text-tavix-red">Log in</Link><Link to="/register" className="btn">Register</Link></>}</div>
        <button className="lg:hidden font-display text-xs" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? "CLOSE" : "MENU"}</button>
      </div>
      {open && <div className="lg:hidden bg-white border-t border-black/10 px-5 py-4 flex flex-col gap-4 font-semibold dd-panel">
        <Link to="/">Home</Link><a href="/#about">About</a>
        <div><p className="text-sm text-black/50">Products</p>{PRODUCTS.map((p) => <a key={p.id} href={p.url} className="block mt-1 text-tavix-red">{p.name} · {p.status} →</a>)}</div>
        <a href="/#portfolio">Portfolio</a><Link to="/careers">Careers</Link><a href="/#contact">Contact</a><Link to="/chat">TAVIX AI page</Link>
        {user ? <><a href="/#client-missions">My missions</a>{user.role === "admin" && <Link to="/admin">Admin</Link>}<button className="text-left" onClick={() => { logout(); nav("/"); }}>Log out</button></> : <><Link to="/login">Log in</Link><Link to="/register">Register</Link></>}
      </div>}
    </header>
  );
}
