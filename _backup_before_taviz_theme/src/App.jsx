import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import AnimLogo from "./components/AnimLogo.jsx";
import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import Safe from "./components/Safe.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import Careers from "./pages/Careers.jsx";
import GameHUD from "./components/GameHUD.jsx";
import ScrollBar from "./components/ScrollBar.jsx";
import GlowCursor from "./components/GlowCursor.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import Admin from "./pages/Admin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminOneTavix from "./pages/AdminOneTavix.jsx";
import { useAuth } from "./auth.jsx";

// The admin area is a separate app shell: no client navbar, no client chat widget.
function AdminShell() {
  const { user, logout } = useAuth(); const nav = useNavigate();
  return (<>
    {user?.role === "admin" && <header className="fixed top-0 inset-x-0 z-40 h-16 bg-black text-white border-b border-tavix-red/60 flex items-center justify-between px-5">
      <div className="flex items-center gap-3"><span className="block w-20 bg-white p-1"><AnimLogo /></span><span className="font-display text-xs hidden sm:inline">COMMAND CENTRE</span></div>
      <div className="flex items-center gap-4"><span className="text-sm text-white/70">{user.name}</span><button className="btn !py-2" onClick={() => { logout(); nav("/admin/login"); }}>Log out</button></div></header>}
    <Routes><Route path="/admin/login" element={<AdminLogin />} /><Route path="/admin" element={<Admin />} /><Route path="/admin/one-tavix" element={<AdminOneTavix />} /><Route path="*" element={<Navigate to="/admin" />} /></Routes>
  </>);
}

function DashboardRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: location.search, hash: "" }} replace />;
}

export default function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 50); else scrollTo(0, 0); }, [pathname, hash]);
  if (pathname.startsWith("/admin")) return <AdminShell />;
  return (<>
    <ScrollBar /><GlowCursor /><ThemeToggle chat={pathname === "/chat"} />
    {pathname !== "/chat" && <Navbar />}
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/careers" element={<Careers />} />
    </Routes>
    {pathname !== "/chat" && <Safe><ChatWidget /></Safe>}
    <GameHUD />
  </>);
}
