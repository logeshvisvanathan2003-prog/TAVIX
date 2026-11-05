import { useTheme, toggleTheme } from "../theme.js";
// Small dark/light switch. Light brings back the previous look of the site.
export default function ThemeToggle({ chat = false }) {
  const t = useTheme(), dark = t === "dark";
  return (
    <button type="button" onClick={toggleTheme} className={"tz-toggle" + (chat ? " on-chat" : "")} aria-pressed={dark}
      aria-label={dark ? "Switch to the previous light look" : "Switch to the new dark look"} title={dark ? "Switch to light (previous look)" : "Switch to dark (new look)"}>
      <span className="tz-tg-track" aria-hidden="true"><i /></span>
      <span className="tz-tg-txt">{dark ? "Dark" : "Light"}</span>
    </button>
  );
}
