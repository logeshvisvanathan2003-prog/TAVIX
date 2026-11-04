import { useEffect, useRef } from "react";

// Your exact TAVIX logo, split into layers (two wings + T A V I X) so it can assemble itself,
// float, shine and react to the mouse in 3D. `light` = white lettering for dark backgrounds.
const LETTERS = ["t", "a", "v", "i", "x"];

export default function LogoAnim({ light = false, className = "", glow = true }) {
  const root = useRef(null);
  useEffect(() => {
    const el = root.current; let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; };
    const loop = () => { x += (tx - x) * .08; y += (ty - y) * .08; el.style.setProperty("--px", x.toFixed(3)); el.style.setProperty("--py", y.toFixed(3)); raf = requestAnimationFrame(loop); };
    addEventListener("pointermove", move, { passive: true }); loop();
    return () => { removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);
  const suf = light ? "-l" : "";
  return (
    <div ref={root} className={"logo3d " + className} role="img" aria-label="TAVIX logo">
      {glow && <span className="lg-glow" aria-hidden="true" />}
      <div className="lg-stage">
        <span className="lg-depth d3"><img className="lg-img lg-wl" src="/logo-wl.png" alt="" draggable="false" /></span>
        <span className="lg-depth d3"><img className="lg-img lg-wr" src="/logo-wr.png" alt="" draggable="false" /></span>
        {LETTERS.map((k, i) => (
          <span key={k} className="lg-depth d1"><img className={"lg-img lg-ltr" + (k === "x" ? " lg-x" : "")} style={{ "--i": i }} src={`/logo-${k}${suf}.png`} alt="" draggable="false" /></span>
        ))}
        <span className="lg-shine" aria-hidden="true" />
      </div>
    </div>
  );
}
