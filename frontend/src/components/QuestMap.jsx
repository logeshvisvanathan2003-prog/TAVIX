import { useEffect } from "react";
import { award } from "../gamify.js";

// The whole mission as a quest: each stage lights up as Taviz AI (and later the TAVIZ team) completes it, and pays XP once.
export const QUEST = [
  { k: "launch", t: "Launched", xp: 0 },
  { k: "req", t: "Requirements", xp: 25, step: "Understanding the requirements" },
  { k: "site", t: "Website", xp: 50, step: "Designing the website prototype" },
  { k: "map", t: "3D map", xp: 25, step: "Mapping the 3D architecture" },
  { k: "rev", t: "Reviewed", xp: 100 },
  { k: "del", t: "Delivered", xp: 200 },
];
export const parseLog = (b) => { try { return JSON.parse(b.build_log || "[]"); } catch { return []; } };

export function questStates(b) {
  const log = parseLog(b), ready = b.build_status === "ready";
  return QUEST.map((q) => {
    if (q.k === "launch") return "done";
    if (q.step) { if (ready) return "done"; const e = log.find((x) => x.name === q.step); if (e) return e.state === "done" ? "done" : e.state === "failed" ? "failed" : "running";
      return b.build_status === "failed" ? "todo" : "todo"; }
    if (q.k === "rev") return b.reviewed && ready ? "done" : ready ? "waiting" : "todo";
    return b.status === "delivered" ? "done" : "todo";
  });
}

export default function QuestMap({ b }) {
  const st = questStates(b), last = st.reduce((a, s, i) => (s === "done" ? i : a), 0);
  useEffect(() => { st.forEach((s, i) => { const q = QUEST[i]; if (s === "done" && q.xp) award(`quest-${b.id}-${q.k}`, q.xp, `Mission #${b.id}: ${q.t} complete`); }); }, [st.join()]);
  const pct = (last / (QUEST.length - 1)) * 100;
  return (
    <div className="mt-5" aria-label="Mission quest map">
      <div className="relative">
        <div className="absolute left-[8.3%] right-[8.3%] top-[17px] h-1 bg-black/10" />
        <div className="absolute left-[8.3%] top-[17px] h-1 bg-tavix-red transition-[width] duration-1000" style={{ width: `calc(${pct / 100} * 83.4%)` }} />
        <ol className="relative grid grid-cols-6">
          {QUEST.map((q, i) => { const s = st[i]; return (
            <li key={q.k} className="flex flex-col items-center text-center px-0.5">
              <span className={"w-9 h-9 grid place-items-center font-display text-xs cut-sm transition-all duration-500 " +
                (s === "done" ? "bg-tavix-red text-white scale-100" : s === "running" ? "bg-black text-white glow" : s === "failed" ? "bg-white border-2 border-tavix-red text-tavix-red" : s === "waiting" ? "bg-white border-2 border-dashed border-black/40" : "bg-white border border-black/20 text-black/30")}>
                {s === "done" ? "✔" : s === "failed" ? "!" : s === "running" ? <span className="w-2 h-2 bg-tavix-red animate-pulse" /> : i + 1}</span>
              <span className={"mt-1.5 text-[13px] leading-tight font-semibold " + (s === "todo" ? "text-black/40" : "")}>{q.t}</span>
              {q.xp > 0 && <span className={"text-[11px] font-display " + (s === "done" ? "text-tavix-red" : "text-black/30")}>{s === "done" ? "✓ " : "+"}{q.xp} XP</span>}
            </li>); })}
        </ol>
      </div>
    </div>
  );
}
