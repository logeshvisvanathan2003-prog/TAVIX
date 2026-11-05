import { useEffect, useRef } from "react";
export default function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef();
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { e.target.classList.add("in"); o.disconnect(); } }, { threshold: 0.15 });
    o.observe(ref.current); return () => o.disconnect();
  }, []);
  return <div ref={ref} style={{ transitionDelay: delay + "ms" }} className={"reveal " + className}>{children}</div>;
}
