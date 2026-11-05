import { useEffect, useState } from "react";
import ChatPanel from "./ChatPanel.jsx";
import WingMark from "./WingMark.jsx";

// Floating button + panel. "Ask Taviz AI about this" on a mission opens it with that mission's context.
export default function ChatWidget() {
  const [open, setOpen] = useState(false), [big, setBig] = useState(false), [mission, setMission] = useState(null);
  useEffect(() => { const h = (e) => { setMission(e.detail?.mission || null); setOpen(true); }; addEventListener("open-tavix-ai", h); return () => removeEventListener("open-tavix-ai", h); }, []);
  return (<div className="site-chrome">
    <button onClick={() => setOpen(!open)} aria-label="Open Taviz AI" className="fixed bottom-5 right-5 z-50 w-16 h-16 bg-black grid place-items-center cut-sm group">
      <span className="absolute inset-0 border-2 border-tavix-red animate-pulseRing" />
      <WingMark className="w-10 relative group-hover:scale-110 transition" spin />
    </button>
    {open && <ChatPanel mission={mission} variant={big ? "overlay" : "panel"} onClose={() => setOpen(false)} onExpand={() => setBig(!big)} />}
  </div>);
}
