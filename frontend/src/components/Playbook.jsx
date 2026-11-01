import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { availableXp, BADGES, HOW_XP, levelOf, rankProgress, RANKS, REWARDS, spend, unlocked, useGame } from "../gamify.js";

const nextRankXp = (xp, level) => level >= RANKS.length - 1 ? 0 : (level + 1) * 100 - xp;

export default function Playbook() {
  const { user } = useAuth();
  const g = useGame();
  const [note, setNote] = useState("");
  const [missions, setMissions] = useState([]);
  const [badgeError, setBadgeError] = useState("");
  const lvl = levelOf(g.xp);
  const free = availableXp(g);
  useEffect(() => {
    if (!user) {
      setMissions([]);
      setBadgeError("");
      return;
    }
    let active = true;
    api("/bookings/mine").then((items) => {
      if (active) setMissions(items);
    }).catch((error) => {
      if (active) setBadgeError(`Badge status unavailable: ${error.message}`);
    });
    return () => { active = false; };
  }, [user]);
  const buy = (id) => {
    const result = spend(id);
    setNote(result.ok ? "Upgrade unlocked. It is now active across your workspace." : result.reason);
  };
  return (
    <section id="playbook" className="py-24 bg-black text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40 playbook-grid" />
      <div className="relative max-w-7xl mx-auto px-5">
        <div className="max-w-3xl rise">
          <p className="font-display text-xs tracking-[.35em] text-tavix-red">TAVIX · GAMIFIED</p>
          <h2 className="text-2xl sm:text-4xl mt-3">Make every mission move your rank</h2>
          <p className="mt-4 text-white/70">
            XP tracks meaningful progress and unlocks optional visual upgrades for your client workspace. It is never money,
            never affects project price or support priority, and never gates a real project feature.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-[.8fr,1.2fr] gap-6">
          <article className="xp-crystal p-6 sm:p-8 cut rise" aria-label="Current XP and rank">
            <div className="flex items-center gap-5">
              <div className="xp-ring shrink-0" style={{ "--xp-progress": `${rankProgress(g.xp)}%` }} role="img" aria-label={`${rankProgress(g.xp)} percent to next rank`}>
                <div className="xp-ring-inner"><span className="font-display text-2xl">{lvl + 1}</span><span className="text-[10px] uppercase tracking-wider text-white/60">Rank</span></div>
              </div>
              <div>
                <p className="font-display text-xs tracking-[.2em] text-tavix-red">YOUR RANK</p>
                <h3 className="text-xl mt-1">{RANKS[lvl]}</h3>
                <p className="text-sm text-white/65 mt-1">{lvl === RANKS.length - 1 ? "Top rank reached" : `${nextRankXp(g.xp, lvl)} XP to ${RANKS[lvl + 1]}`}</p>
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between gap-3">
              <div><p className="font-display text-4xl">{g.xp} <span className="text-lg">XP</span></p><p className="text-sm text-white/65">{free} ready to spend · {g.spent} spent on upgrades</p></div>
              <span className="font-display text-xs text-white/50">{lvl === RANKS.length - 1 ? "MAX RANK" : `${rankProgress(g.xp)}% TO NEXT`}</span>
            </div>
            <div className="mt-3 h-2 bg-white/15 overflow-hidden"><div className="xp-progress-fill h-full bg-tavix-red transition-[width] duration-700" style={{ width: `${rankProgress(g.xp)}%` }} /></div>
            <p className="mt-4 text-sm text-white/60">Ranks are progress markers. Upgrades below are optional and can be used on this device.</p>
          </article>

          <article className="border border-white/15 p-6 sm:p-8 cut bg-white/[.04] rise" style={{ animationDelay: "100ms" }}>
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div><p className="font-display text-xs tracking-[.2em] text-tavix-red">THE MISSION PATH</p><h3 className="text-lg mt-2">Your next milestones</h3></div>
              <p className="text-sm text-white/60">Every 100 lifetime XP advances your rank</p>
            </div>
            <ol className="xp-rank-path mt-7 grid grid-cols-3 sm:grid-cols-6 gap-3">
              {RANKS.map((rank, index) => {
                const active = lvl === index;
                const complete = lvl > index;
                return <li key={rank} className={"xp-rank-stop text-center " + (active ? "is-current" : complete ? "is-complete" : "")}>
                  <span className="xp-rank-node mx-auto grid place-items-center w-10 h-10 rounded-full border text-xs font-display">{complete ? "✓" : index + 1}</span>
                  <span className="block mt-2 text-xs font-semibold">{rank}</span>
                  <span className="block mt-1 text-[10px] text-white/45">{index * 100} XP</span>
                </li>;
              })}
            </ol>
          </article>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.2fr,.8fr] gap-6">
          <article className="border border-white/15 p-6 cut bg-white/[.04]">
            <div className="flex justify-between items-end gap-4 flex-wrap">
              <div><p className="font-display text-xs tracking-[.2em] text-tavix-red">EARN XP</p><h3 className="text-lg mt-2">Clear rules. No hidden multipliers.</h3></div>
              <p className="text-sm text-white/50">Amounts show when and how often XP is awarded.</p>
            </div>
            <ul className="mt-5 grid sm:grid-cols-2 gap-3">
              {HOW_XP.map((item) => (
                <li key={item.when} className="xp-rule-card group flex gap-3 items-start p-3 border border-white/10 bg-white/[.025]">
                  <span className="xp-rule-value shrink-0 font-display text-sm text-tavix-red">+{item.xp}</span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{item.when}</span><span className="block mt-1 text-xs text-white/50">{item.limit}</span></span>
                </li>
              ))}
            </ul>
          </article>

          <article className="border border-white/15 p-6 cut bg-white/[.04]">
            <div><p className="font-display text-xs tracking-[.2em] text-tavix-red">MAKE XP USEFUL</p><h3 className="text-lg mt-2">Personalize your workspace</h3></div>
            <p className="mt-2 text-sm text-white/65">Unlock once with unspent XP. These upgrades only change visual effects in the HUD or Build Studio.</p>
            <ul className="mt-5 space-y-3">
              {REWARDS.map((item) => {
                const active = unlocked(item.id, g);
                const short = Math.max(0, item.cost - free);
                return <li key={item.id} className={"xp-reward-card p-3 border transition-all duration-300 " + (active ? "border-tavix-red/70 bg-tavix-red/[.08]" : "border-white/10 bg-white/[.025]")}>
                  <div className="flex items-start gap-3">
                    <span className={"xp-reward-icon grid place-items-center w-9 h-9 shrink-0 border " + (active ? "border-tavix-red text-tavix-red" : "border-white/20 text-white/60")}>{active ? "✓" : "✦"}</span>
                    <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-semibold">{item.name}</p><span className="font-display text-xs text-white/60">{item.cost} XP</span></div>
                      <p className="mt-1 text-xs leading-relaxed text-white/55">{item.hint}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{item.group}</p>
                    </div>
                    <button className="btn-o !py-1.5 !px-2.5 !text-[10px]" disabled={active || short > 0} onClick={() => buy(item.id)}>{active ? "Active" : short ? `Need ${short}` : "Unlock"}</button>
                  </div>
                </li>;
              })}
            </ul>
            {note && <p className="mt-3 text-sm text-amber-300" role="status">{note}</p>}
          </article>
        </div>

        <div className="mt-8 grid lg:grid-cols-[.7fr,1.3fr] gap-6">
          <article className="border border-white/15 p-6 cut bg-white/[.04]">
            <p className="font-display text-xs tracking-[.2em] text-tavix-red">MISSION BADGES</p>
            <p className="mt-2 text-sm text-white/55">Earn these by using real project features. Locked badges show what to try next.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {BADGES.map((badge) => {
                const earned = badge.test(g, missions);
                return <span key={badge.id} title={earned ? badge.name : badge.hint} className={"xp-badge px-3 py-1.5 cut-sm text-xs " + (earned ? "is-earned" : "is-locked")}>{earned ? "★ " : "◇ "}{badge.name}</span>;
              })}
            </div>
            {badgeError && <p className="mt-3 text-xs text-amber-300" role="status">{badgeError}</p>}
          </article>
          <article className="border border-white/15 p-6 cut bg-white/[.04]">
            <div className="flex justify-between items-end gap-3"><div><p className="font-display text-xs tracking-[.2em] text-tavix-red">XP LEDGER</p><h3 className="text-lg mt-2">Recent activity</h3></div><p className="text-xs text-white/45">Latest {Math.min(g.log.length, 8)} entries</p></div>
            {g.log.length ? <ol className="mt-4 grid sm:grid-cols-2 gap-2">{g.log.slice(0, 8).map((row, index) => (
              <li key={row.id + row.at} className="xp-ledger-row flex items-center gap-3 px-3 py-2.5 border-l-2 border-tavix-red bg-white/[.035]" style={{ animationDelay: `${index * 45}ms` }}>
                <span className={"font-display text-sm " + (row.xp < 0 ? "text-white/60" : "text-tavix-red")}>{row.xp > 0 ? "+" : ""}{row.xp}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/75">{row.label}</span>
                <time className="shrink-0 text-[10px] text-white/35" dateTime={new Date(row.at).toISOString()}>{new Date(row.at).toLocaleDateString()}</time>
              </li>
            ))}</ol> : <p className="mt-4 text-sm text-white/55">Your first points will appear here after you explore a section or start a mission.</p>}
          </article>
        </div>
        <p className="mt-6 text-xs text-white/40">XP and cosmetic unlocks are saved in this browser on this device; they do not sync between devices or accounts. No purchase is required, and spending XP never removes earned rank progress.</p>
      </div>
    </section>
  );
}
