import { useEffect, useRef, useState } from "react";
import { confetti, RANKS, unlocked } from "../gamify.js";

export default function GameHUD() {
  const [toasts, setToasts] = useState([]);
  const [rank, setRank] = useState(null);
  const [orbs, setOrbs] = useState([]);
  const timers = useRef(new Map());
  const sequence = useRef(0);
  useEffect(() => {
    const h = (e) => {
      const id = ++sequence.current;
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, 3200);
      timers.current.set(id, timer);
      setToasts((current) => [...current.slice(-3), { id, ...e.detail }]);
      if (unlocked("xp-orbs") && e.detail.kind !== "spend") {
        setOrbs((current) => [...current.slice(-8), { id, x: 48, y: innerHeight - 80 }]);
        setTimeout(() => setOrbs((current) => current.filter((orb) => orb.id !== id)), 900);
      }
      if (e.detail.up) {
        setTimeout(() => {
          setRank(e.detail.rank);
          confetti(unlocked("gold-wing") ? 220 : 150);
          setTimeout(() => setRank(null), 3800);
        }, 700);
      }
    };
    addEventListener("xp", h);
    return () => {
      removeEventListener("xp", h);
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, []);
  return (
    <>
      <div className="site-chrome fixed left-3 bottom-3 z-[90] space-y-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"xp-toast slide-in px-4 py-3 cut-sm shadow-xl flex items-center gap-3 " + (t.kind === "spend" ? "bg-white text-black border-l-4 border-black" : "bg-black text-white border-l-4 border-tavix-red")}>
            <span className="font-display text-tavix-red text-sm">{t.xp > 0 ? "+" : ""}{t.xp} XP</span>
            <span className="text-base">{t.label}</span>
          </div>
        ))}
      </div>
      {orbs.map((orb) => <span key={orb.id} className="xp-orb site-chrome" />)}
      {rank !== null && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="rank-up-title">
          <div className="rise text-center text-white p-10 rank-burst">
            <p className="font-display text-xs tracking-[.4em] text-tavix-red">RANK UP</p>
            <h2 id="rank-up-title" className="font-display text-4xl sm:text-6xl mt-4">{RANKS[rank]}</h2>
            <p className="mt-4 text-white/70">Your rank moved up. Spend unspent XP in the Gamified section to add visual upgrades to your workspace.</p>
            <a href="/#playbook" className="btn-o mt-6 inline-block" onClick={() => setRank(null)}>See XP upgrades</a>
            <button className="btn mt-6" onClick={() => setRank(null)}>Keep building</button>
          </div>
        </div>
      )}
    </>
  );
}
