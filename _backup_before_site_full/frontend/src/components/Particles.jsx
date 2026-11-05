import { useEffect, useRef } from "react";
// Red node network that reacts to the pointer
export default function Particles() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d"); let w, h, raf, mouse = { x: -999, y: -999 };
    const pts = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .0006, vy: (Math.random() - .5) * .0006 }));
    const size = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    const move = (e) => { const r = c.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const draw = () => {
      x.clearRect(0, 0, w, h);
      pts.forEach((p, i) => {
        p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
        const px = p.x * w, py = p.y * h;
        x.fillStyle = "#E10600"; x.fillRect(px, py, 2.5, 2.5);
        for (let j = i + 1; j < pts.length; j++) {
          const qx = pts[j].x * w, qy = pts[j].y * h, dd = Math.hypot(px - qx, py - qy);
          if (dd < 130) { x.strokeStyle = `rgba(225,6,0,${.28 * (1 - dd / 130)})`; x.beginPath(); x.moveTo(px, py); x.lineTo(qx, qy); x.stroke(); }
        }
        const dm = Math.hypot(px - mouse.x, py - mouse.y);
        if (dm < 170) { x.strokeStyle = `rgba(${document.documentElement.classList.contains("tz") ? "255,255,255" : "0,0,0"},${.35 * (1 - dm / 170)})`; x.beginPath(); x.moveTo(px, py); x.lineTo(mouse.x, mouse.y); x.stroke(); }
      });
      raf = requestAnimationFrame(draw);
    };
    size(); draw(); addEventListener("resize", size); c.parentElement.addEventListener("pointermove", move);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}
