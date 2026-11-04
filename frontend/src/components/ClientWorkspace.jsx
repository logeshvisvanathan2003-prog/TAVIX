import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { createChatSessionId } from "../chatSessions.js";
import AnimLogo from "./AnimLogo.jsx";

export default function ClientWorkspace({ active, title, subtitle, historyChats = [], historyLoading = false, historyError = "", historyActionError = "", deletingChatId = null, selectedChatId = null, onChatSelect, onChatDelete, onMissionSelect, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <>
      <Link to="/" className="flex items-center gap-3 px-5 pt-5 pb-6 border-b border-white/10" onClick={() => setMobileOpen(false)}>
        <span className="block w-[84px] shrink-0"><AnimLogo light /></span>
        <span><span className="block font-display text-xs tracking-[.18em]">TAVIZ</span><span className="block mt-1 text-[10px] uppercase tracking-[.22em] text-white/45">Client workspace</span></span>
      </Link>
      <div className="p-4">
        <button type="button" className="workspace-new-mission flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-sm" onClick={() => { navigate(`/chat?session=${createChatSessionId()}`); setMobileOpen(false); }}>
          <span aria-hidden="true">＋</span> Start a new conversation
        </button>
      </div>
      {active === "assistant" && <section className="workspace-history-list mt-7 px-3" aria-label="History chats">
        <div className="flex items-center justify-between px-3 pb-2"><p className="text-[10px] font-display uppercase tracking-[.18em] text-white/40">History chats</p><span className="text-[10px] text-white/40">{historyChats.length}</span></div>
        {historyActionError && <p role="alert" className="px-3 pb-2 text-xs text-red-300">{historyActionError}</p>}
        {historyChats.length ? <div className="space-y-1">
          {historyChats.map((chat) => <div key={chat.session_id} className={"workspace-recent-mission flex items-center rounded-lg " + (chat.session_id === selectedChatId ? "is-selected" : "")}>
            <button type="button" onClick={() => { onChatSelect?.(chat.session_id); setMobileOpen(false); }} className="min-w-0 flex-1 text-left px-3 py-2">
              <span className="block truncate text-sm">{chat.title}</span>
              <span className="mt-1 block truncate text-[11px] text-white/40">{chat.preview}</span>
            </button>
            <button type="button" aria-label={`Delete conversation: ${chat.title}`} title="Delete conversation" disabled={deletingChatId === chat.session_id} onClick={() => {
              if (window.confirm(`Permanently delete "${chat.title}" and its messages?`)) onChatDelete?.(chat.session_id);
            }} className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/45 transition hover:bg-red-500/20 hover:text-red-200 disabled:opacity-40">
              {deletingChatId === chat.session_id ? "…" : "×"}
            </button>
          </div>)}
        </div> : <p className={"px-3 py-2 text-xs leading-relaxed " + (historyError ? "text-red-300" : "text-white/45")}>{historyError || (historyLoading ? "Loading chat history…" : "Your previous conversations will appear here.")}</p>}
      </section>}
      <div className="mt-auto p-4">
        <div className="workspace-account flex items-center gap-3 p-3 rounded-xl">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-tavix-red text-white font-display text-xs">{(user?.name || "T").trim().charAt(0).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user?.name || "TAVIZ client"}</span><span className="block truncate text-[11px] text-white/40">Your project space</span></span>
          <button type="button" aria-label="Log out" title="Log out" className="workspace-logout px-2 py-1 text-xs" onClick={() => { logout(); navigate("/"); }}>↗</button>
        </div>
      </div>
    </>
  );

  return <div className="client-workspace min-h-screen">
    <aside className="workspace-sidebar hidden lg:flex flex-col">{sidebar}</aside>
    {mobileOpen && <button className="workspace-backdrop lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={"workspace-sidebar workspace-mobile-sidebar lg:hidden flex flex-col " + (mobileOpen ? "is-open" : "")} aria-label="Client workspace navigation">{sidebar}</aside>
    <div className="workspace-main min-h-screen min-w-0 lg:ml-[272px]">
      <header className={"workspace-topbar sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-7 h-[68px] " + (active === "assistant" ? "workspace-topbar-assistant" : "")}>
        <button type="button" className="workspace-menu-button lg:hidden grid place-items-center w-9 h-9 rounded-lg" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>☰</button>
        <div className="min-w-0 flex-1"><p className="font-display text-[10px] uppercase tracking-[.18em] text-tavix-red">{active === "assistant" ? "TAVIZ · INTELLIGENCE" : "TAVIZ · MISSION CONTROL"}</p><h1 className="truncate text-base sm:text-lg">{title}</h1></div>
        {subtitle && <span className="hidden md:block max-w-[42%] truncate text-xs text-black/45">{subtitle}</span>}
        <Link to="/chat" className="workspace-ai-shortcut shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"><span className="workspace-ai-dot" /> TAVIZ AI</Link>
      </header>
      <div className="workspace-content">{children}</div>
    </div>
  </div>;
}
