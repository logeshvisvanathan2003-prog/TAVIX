// TAVIZ wing mark (two swept blades) with the HUD ring: a dashed ring turns slowly around it and a red arc sweeps the other way.
export default function WingMark({ className = "", spin = false }) {
  return (
    <span className={"wm-wrap " + className}>
      <svg viewBox="0 0 100 60" className="wm-svg" aria-hidden="true">
        <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF1A0F" /><stop offset="1" stopColor="#8A0000" /></linearGradient></defs>
        <g className={spin ? "animate-pulse" : ""}>
          <path d="M2 4 C28 6 44 14 49 26 L51 56 C44 40 34 24 2 4Z" fill="url(#wg)" />
          <path d="M98 4 C72 6 56 14 51 26 L49 56 C56 40 66 24 98 4Z" fill="url(#wg)" />
        </g>
      </svg>
      <i className="wm-ring a" aria-hidden="true" /><i className="wm-ring b" aria-hidden="true" />
    </span>
  );
}
