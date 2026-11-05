import { useEffect, useRef } from "react";
// Thin red progress line at the very top that fills as the page scrolls.
export default function ScrollBar() {
  const ref = useRef();
  useEffect(() => {
    let raf = 0;
    const upd = () => { raf = 0; const h = document.documentElement; const m = h.scrollHeight - h.clientHeight; if (ref.current) ref.current.style.transform = `scaleX(${m > 0 ? Math.min(1, scrollY / m) : 0})`; };
    const on = () => { if (!raf) raf = requestAnimationFrame(upd); };
    upd(); addEventListener("scroll", on, { passive: true }); addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="tz-progress" aria-hidden="true"><i ref={ref} /></div>;
}
