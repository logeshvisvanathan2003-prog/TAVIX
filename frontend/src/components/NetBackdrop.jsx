import { useEffect, useRef } from "react";

// TAVIX signal network: a page-wide field of red nodes and thin links, like the company site.
// Nodes drift, reach toward the pointer, and small red "signals" travel along the links.
// Sits behind everything (position fixed, z-index -1), pauses when the tab is hidden, and is
// drawn once without motion for people who prefer reduced motion.
export default function NetBackdrop() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, mouse = { x: -999, y: -999 }, pts = [], sig = [], t0 = 0;
    const build = () => {
      const n = Math.max(28, Math.min(90, Math.round((w * h) / 22000)));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: 1.4 + Math.random() * 1.6 }));
    };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    const L = 150;
    const frame = (now) => {
      const dt = Math.min(40, now - (last || now)); last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!still) { p.x += p.vx * dt * .06 * 16; p.y += p.vy * dt * .06 * 16; }
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
      }
      const links = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) { links.push([i, j]); ctx.strokeStyle = `rgba(225,6,0,${.38 * (1 - d / L)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      for (const p of pts) {
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y), near = dm < 170;
        if (near) { ctx.strokeStyle = `rgba(10,10,10,${.4 * (1 - dm / 170)})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
        const s = p.r + (near ? 2.4 * (1 - dm / 170) : 0);
        ctx.fillStyle = "#E10600"; ctx.fillRect(p.x - s / 2 - .5, p.y - s / 2 - .5, s + 1, s + 1);
      }
      if (!still) {
        if (links.length && sig.length < 7 && now - t0 > 700) { t0 = now; const [i, j] = links[(Math.random() * links.length) | 0]; sig.push({ i, j, k: 0 }); }
        sig = sig.filter((s) => s.k < 1);
        for (const s of sig) {
          s.k += dt / 900;
          const a = pts[s.i], b = pts[s.j], x = a.x + (b.x - a.x) * s.k, y = a.y + (b.y - a.y) * s.k;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, "rgba(225,6,0,.55)"); g.addColorStop(1, "rgba(225,6,0,0)");
          ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18); ctx.fillStyle = "#E10600"; ctx.fillRect(x - 2, y - 2, 4, 4);
        }
        raf = requestAnimationFrame(frame);
      }
    };
    const move = (e) => { mouse = { x: e.clientX, y: e.clientY }; };
    const leave = () => { mouse = { x: -999, y: -999 }; };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    size(); raf = requestAnimationFrame(frame);
    window.addEventListener("resize", size); window.addEventListener("pointermove", move); document.addEventListener("pointerleave", leave); document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return <canvas ref={ref} className="netbg" aria-hidden="true" />;
}
