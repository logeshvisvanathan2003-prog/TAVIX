import LogoAnim from "./LogoAnim.jsx";
import HudRings from "./HudRings.jsx";

// The TAVIX logo with its signature animation: wings and letters assemble, the logo floats and shines and follows the pointer in 3D.
// `rings` adds the rotating HUD rings and radar sweep around it. `light` = white lettering for dark backgrounds.
// The parent sets the size (width); the logo fills it.
export default function AnimLogo({ rings = false, light = false, className = "" }) {
  if (!rings) return <div className={"al-logo " + className}><LogoAnim light={light} glow={false} /></div>;
  return <div className={"al-art " + className}><HudRings /><LogoAnim light={light} /></div>;
}
