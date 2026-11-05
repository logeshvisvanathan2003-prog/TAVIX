import { useEffect, useState } from "react";
import { award, availableXp, levelOf, rankProgress, RANKS, unlocked, useGame } from "../gamify.js";

const SECTIONS = { sectors: "Sectors", projects: "Projects", feed: "Client feed", founder: "Founder", book: "Booking" };

export default function XPBar() {
  const g = useGame();
  const [p, setP] = useState(0);
  const [open, setOpen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  useEffect(() => {
    const f = () => {
      setP(scrollY / Math.max(1, document.body.scrollHeight - innerHeight));
      const nearTop = scrollY < Math.min(140, innerHeight * 0.25);
      setShowHud(nearTop);
      if (!nearTop) setOpen(false);
    };
    f();
    addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);
  useEffect(() => {
    const o = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && award("sec-" + e.target.id, 10, "Discovered " + SECTIONS[e.target.id])), { threshold: 0.4 });
    Object.keys(SECTIONS).forEach((id) => document.getElementById(id) && o.observe(document.getElementById(id)));
    return () => o.disconnect();
  }, []);
  const lvl = levelOf(g.xp);
  const found = g.done.filter((x) => x.startsWith("sec-")).length;
  return (
    <>
      <div className="site-chrome fixed top-16 inset-x-0 z-40 h-1.5 bg-black/10">
        <div className="h-full bg-tavix-red transition-[width] duration-150" style={{ width: p * 100 + "%" }} />
      </div>
      <button type="button" onClick={() => setOpen(!open)} className={"site-chrome fixed top-20 right-3 z-40 w-52 max-w-[calc(100vw-1.5rem)] font-display text-[10px] px-3 py-2 cut-sm text-left transition-opacity " + (showHud ? "opacity-100" : "opacity-0 pointer-events-none") + " " + (unlocked("gold-wing", g) ? "gold-wing text-black" : "bg-black text-white ") + (unlocked("hud-pulse", g) ? " hud-pulse" : "")} aria-expanded={open} aria-controls="xp-help" aria-label={`Rank ${lvl + 1}, ${RANKS[lvl]}, ${g.xp} XP. Tap for progress details.`} aria-hidden={!showHud} tabIndex={showHud ? 0 : -1}>
        <div className="flex items-center justify-between gap-2"><span>LVL {lvl + 1} · {RANKS[lvl]}</span><span>{g.xp} XP</span></div>
        <div className="mt-1.5 h-1 bg-white/20"><div className="h-full bg-tavix-red transition-all duration-700" style={{ width: rankProgress(g.xp) + "%" }} /></div>
      </button>
      {open && showHud && (
        <div id="xp-help" className="site-chrome fixed top-36 right-3 z-40 w-72 max-w-[calc(100vw-1.5rem)] bg-white text-black p-4 cut shadow-xl border border-black/10">
          <p className="font-display text-xs text-tavix-red">YOUR XP · {availableXp(g)} READY TO SPEND</p>
          <p className="mt-2 text-sm">Earned from missions, reviews, chat, and exploring; spent on optional workspace visuals. XP stays in this browser and never affects price or support priority.</p>
          <p className="mt-2 text-xs text-black/60">Homepage sections discovered: {found}/5</p>
          <a href="#playbook" className="btn !py-2 mt-3 inline-block" onClick={() => setOpen(false)}>Open playbook</a>
        </div>
      )}
    </>
  );
}
