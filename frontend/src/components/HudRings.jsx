// Rotating HUD rings + radar sweep drawn behind the logo. Pure SVG/CSS, decorative only.
export default function HudRings() {
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  return (
    <div className="hud-rings" aria-hidden="true">
      <svg viewBox="-100 -100 200 200">
        <g className="r1"><circle r="96" fill="none" stroke="rgba(225,6,0,.55)" strokeWidth=".6" strokeDasharray="2 5" />
          {ticks.map((i) => <line key={i} x1="0" y1="-92" x2="0" y2={i % 6 ? -89.5 : -86} stroke="rgba(225,6,0,.7)" strokeWidth=".5" transform={`rotate(${i * 5})`} />)}</g>
        <g className="r2"><circle r="80" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth=".5" strokeDasharray="30 8 4 8" />
          <path d="M0 -80 A80 80 0 0 1 69.3 -40" fill="none" stroke="#E10600" strokeWidth="1.6" /></g>
        <g className="r3"><circle r="66" fill="none" stroke="rgba(225,6,0,.4)" strokeWidth=".5" strokeDasharray="1 3" />
          <path d="M0 66 A66 66 0 0 1 -57 33" fill="none" stroke="#E10600" strokeWidth="1.4" /></g>
        <path d="M-100 0H-90M90 0H100M0 -100V-90M0 90V100" stroke="#E10600" strokeWidth="1" />
      </svg>
      <span className="radar" />
    </div>
  );
}
