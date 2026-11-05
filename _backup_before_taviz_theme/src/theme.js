import { useSyncExternalStore } from "react";
// Dark (new TAVIZ look) or light (the previous look). The choice is remembered in this browser.
const KEY = "taviz_theme";
const subs = new Set();
const read = () => { try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; } };
let current = read();
const apply = () => document.documentElement.classList.toggle("tz", current === "dark");
export function initTheme() { current = read(); apply(); }
export function setTheme(t) { current = t; try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ } apply(); subs.forEach((f) => f()); }
export const toggleTheme = () => setTheme(current === "dark" ? "light" : "dark");
export function useTheme() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current, () => "dark"); }
