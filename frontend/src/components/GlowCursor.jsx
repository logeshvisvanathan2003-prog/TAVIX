import { useEffect, useRef } from "react";
// A soft red glow that follows the pointer. Off on touch screens and when the visitor prefers reduced motion.
export default function GlowCursor() {
  const ref = useRef();
  useEffect(() => {
    if (matchMedia("(pointer: coarse)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = innerWidth / 2, y = innerHeight / 3, tx = x, ty = y, raf = 0;
    const move = (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => { x += (tx - x) * .14; y += (ty - y) * .14; if (ref.current) ref.current.style.transform = `translate3d(${x - 260}px,${y - 260}px,0)`; raf = Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(tick) : 0; };
    addEventListener("pointermove", move, { passive: true });
    return () => { removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="tz-cursor" aria-hidden="true" />;
}
