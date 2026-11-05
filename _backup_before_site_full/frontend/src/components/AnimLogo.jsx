import LogoAnim from "./LogoAnim.jsx";
import HudRings from "./HudRings.jsx";
import { useTheme } from "../theme.js";

// The TAVIZ logo with its signature animation: wings and letters assemble, the logo floats and shines and follows the pointer in 3D.
// `rings` adds the rotating HUD rings and radar sweep around it. `light` = white lettering for dark backgrounds.
// The parent sets the size (width); the logo fills it.
export default function AnimLogo({ rings = false, light = false, dk = false, className = "" }) {
  const dark = useTheme() === "dark"; // dk = white lettering only while the dark look is on
  light = light || (dk && dark);
  if (!rings) return <div className={"al-logo " + className}><LogoAnim light={light} glow={false} /></div>;
  return <div className={"al-art " + className}><HudRings /><LogoAnim light={light} /></div>;
}
