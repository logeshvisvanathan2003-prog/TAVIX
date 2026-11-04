import { useEffect, useState } from "react";
import { getStored, setStored } from "./storage.js";

const KEY = "tavix_game";

const empty = () => ({ xp: 0, spent: 0, done: [], unlocks: [], log: [] });

const read = () => {
  try {
    const value = JSON.parse(getStored(KEY) || "{}");
    return {
      xp: Number.isFinite(value.xp) ? value.xp : 0,
      spent: Number.isFinite(value.spent) ? value.spent : 0,
      done: Array.isArray(value.done) ? value.done : [],
      unlocks: Array.isArray(value.unlocks) ? value.unlocks : [],
      log: Array.isArray(value.log) ? value.log : [],
    };
  } catch {
    return empty();
  }
};

export const RANKS = ["Scout", "Builder", "Engineer", "Architect", "Pioneer", "Legend"];
export const levelOf = (xp) => Math.min(RANKS.length - 1, Math.floor(xp / 100));
export const rankProgress = (xp) => (levelOf(xp) === RANKS.length - 1 ? 100 : xp % 100);
export const availableXp = (g = read()) => Math.max(0, g.xp - g.spent);

export const HOW_XP = [
  { xp: 10, when: "Explore a homepage section", limit: "Once per section, up to 5 sections", group: "Explore" },
  { xp: 20, when: "Send your first message to Tavix AI", limit: "Once", group: "Connect" },
  { xp: 25, when: "Use voice input", limit: "Once", group: "Connect" },
  { xp: 25, when: "Your mission requirements are completed", limit: "Each mission", group: "Build" },
  { xp: 50, when: "Your website prototype is ready", limit: "Each mission", group: "Build" },
  { xp: 25, when: "Your 3D architecture map is ready", limit: "Each mission", group: "Build" },
  { xp: 100, when: "Launch a mission", limit: "Each mission", group: "Build" },
  { xp: 100, when: "A TAVIX engineer reviews your build", limit: "Each reviewed mission", group: "Build" },
  { xp: 200, when: "Your mission is marked delivered", limit: "Each mission", group: "Build" },
  { xp: 50, when: "Share an honest review of a project", limit: "Once per project", group: "Contribute" },
  { xp: 30, when: "Download a project ZIP", limit: "Once per mission", group: "Contribute" },
  { xp: 30, when: "Request a build change", limit: "Once", group: "Contribute" },
  { xp: 30, when: "Raise your first support ticket", limit: "Once", group: "Contribute" },
];

export const REWARDS = [
  { id: "hud-pulse", cost: 40, name: "Pulse HUD", hint: "Adds an animated pulse to your rank chip and mission progress card.", group: "Dashboard" },
  { id: "xp-orbs", cost: 60, name: "XP orbs", hint: "Adds a short visual trail from the XP toast when you earn points.", group: "Animation" },
  { id: "architect-lens", cost: 90, name: "Architect lens", hint: "Adds a subtle scan highlight to your website preview and 3D map.", group: "Build Studio" },
  { id: "gold-wing", cost: 140, name: "Gold wing", hint: "Adds a gold frame to your rank chip and mission progress card.", group: "Dashboard" },
];

export function unlocked(id, g = read()) {
  return g.unlocks.includes(id) || levelOf(g.xp) >= 5 && id === "gold-wing";
}

export function award(id, xp, label) {
  const g = read();
  if (g.done.includes(id)) return;
  const before = levelOf(g.xp);
  g.done.push(id);
  g.xp += xp;
  g.log.unshift({ id, xp, label, at: Date.now() });
  g.log = g.log.slice(0, 24);
  setStored(KEY, JSON.stringify(g));
  dispatchEvent(new CustomEvent("xp", { detail: { xp, label, id, rank: levelOf(g.xp), up: levelOf(g.xp) > before, kind: "earn" } }));
}

export function spend(id) {
  const reward = REWARDS.find((item) => item.id === id);
  if (!reward) return { ok: false, reason: "Unknown reward" };
  const g = read();
  if (g.unlocks.includes(id)) return { ok: false, reason: "Already unlocked" };
  if (availableXp(g) < reward.cost) return { ok: false, reason: "Not enough unspent XP" };
  g.spent += reward.cost;
  g.unlocks.push(id);
  g.log.unshift({ id: "spend-" + id, xp: -reward.cost, label: "Unlocked " + reward.name, at: Date.now() });
  setStored(KEY, JSON.stringify(g));
  dispatchEvent(new CustomEvent("xp", { detail: { xp: -reward.cost, label: "Unlocked " + reward.name, id, rank: levelOf(g.xp), up: false, kind: "spend" } }));
  return { ok: true };
}

export function useGame() {
  const [g, setG] = useState(read);
  useEffect(() => {
    const f = () => setG(read());
    addEventListener("xp", f);
    return () => removeEventListener("xp", f);
  }, []);
  return g;
}

const has = (g, p) => g.done.some((x) => x.startsWith(p));
export const BADGES = [
  { id: "first", name: "First mission", hint: "Launch a mission", test: (g, r) => r.length > 0 },
  { id: "builder", name: "Builder", hint: "Get an AI build finished", test: (g, r) => r.some((x) => x.build_status === "ready") },
  { id: "shipped", name: "Shipped", hint: "Have a mission delivered", test: (g, r) => r.some((x) => x.status === "delivered") },
  { id: "multi", name: "Multi-sector", hint: "Launch missions in 2 sectors", test: (g, r) => new Set(r.map((x) => x.sector)).size > 1 },
  { id: "explorer", name: "Explorer", hint: "Discover all 5 sections", test: (g) => g.done.filter((x) => x.startsWith("sec-")).length >= 5 },
  { id: "talker", name: "Conversationalist", hint: "Chat with Tavix AI", test: (g) => has(g, "chat-first") },
  { id: "voice", name: "Voice command", hint: "Use voice input", test: (g) => has(g, "voice-first") },
  { id: "reviewer", name: "Honest reviewer", hint: "Rate a delivered project", test: (g) => has(g, "fb-") },
  { id: "exporter", name: "Project exporter", hint: "Download a project ZIP", test: (g) => has(g, "export-") },
  { id: "support", name: "Support hero", hint: "Raise a support ticket", test: (g) => has(g, "ticket-first") },
  { id: "reviser", name: "Perfectionist", hint: "Request changes to a build", test: (g) => has(g, "revise-first") },
];

export function confetti(n = 150) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  c.width = innerWidth;
  c.height = innerHeight;
  c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:95";
  document.body.appendChild(c);
  const x = c.getContext("2d");
  const cols = ["#E10600", "#ffffff", "#fbbf24", "#ff5a4f", "#111111"];
  const ps = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 240,
    y: innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 4,
    s: 6 + Math.random() * 8,
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.45,
    c: cols[(Math.random() * cols.length) | 0],
  }));
  let t = 0;
  const f = () => {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach((p) => {
      p.vy += 0.36;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.r);
      x.fillStyle = p.c;
      x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      x.restore();
    });
    if (++t < 140) requestAnimationFrame(f);
    else c.remove();
  };
  f();
}
