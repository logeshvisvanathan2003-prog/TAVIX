import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DEVICES = [["100%", "Desktop"], ["768px", "Tablet"], ["390px", "Phone"]];

export function withPreviewFix(html) {
  const fix = `<style id="tavix-fs-fix">html,body{height:auto!important;min-height:100%!important;overflow:auto!important;overflow-x:hidden!important;}</style><script id="tavix-preview-navigation-fix">
document.addEventListener("click", function (event) {
  const link = event.target.closest("a[href]");
  if (!link || event.defaultPrevented || link.hasAttribute("download")) return;
  let url, base;
  try { base = new URL(document.baseURI); url = new URL(link.getAttribute("href"), base); } catch { return; }
  const host = url.hostname.toLowerCase();
  const tavixHost = host === "tavixai.in" || host.endsWith(".tavixai.in") || host === "tavix.in" || host.endsWith(".tavix.in");
  if (url.origin !== base.origin && !tavixHost) return;
  event.preventDefault();
  const slug = (value) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const candidates = [url.hash.slice(1), url.pathname.split("/").filter(Boolean).pop(), link.textContent.trim()]
    .map((value) => { try { return decodeURIComponent(value || ""); } catch { return value || ""; } })
    .map(slug).filter(Boolean);
  const ids = Array.from(document.querySelectorAll("[id]"));
  const target = candidates.map((candidate) => ids.find((node) => slug(node.id) === candidate)).find(Boolean);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  else if (url.pathname === "/" && !url.hash) window.scrollTo({ top: 0, behavior: "smooth" });
  else {
    const firstSection = document.querySelector("main section, main, section");
    if (firstSection) firstSection.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, true);
</script>`;
  if (/<\/head>/i.test(html || "")) return html.replace(/<\/head>/i, fix + "</head>");
  return fix + (html || "");
}

export default function FullPreview({ html, title, onClose }) {
  const [dev, setDev] = useState("100%");
  const box = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    document.documentElement.classList.add("preview-open");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = box.current;
    const go = async () => {
      try { if (node && !document.fullscreenElement) await node.requestFullscreen(); } catch { /* overlay still covers the app */ }
    };
    go();
    const onFs = () => { if (!document.fullscreenElement) onClose(); };
    addEventListener("fullscreenchange", onFs);
    return () => {
      removeEventListener("keydown", k);
      removeEventListener("fullscreenchange", onFs);
      document.documentElement.classList.remove("preview-open");
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);
  return createPortal(
    <div ref={box} className="fixed inset-0 z-[400] bg-neutral-950 flex flex-col" role="dialog" aria-modal="true" aria-label="Full screen preview">
      <div className="flex items-center gap-3 p-3 text-white flex-wrap bg-black shrink-0">
        <span className="font-display text-xs text-tavix-red">FULL SCREEN PREVIEW</span>
        <span className="flex-1 truncate">{title}</span>
        {DEVICES.map(([w, l]) => (
          <button key={w} onClick={() => setDev(w)} className={"px-3 py-1 border " + (dev === w ? "bg-tavix-red border-tavix-red" : "border-white/30")}>{l}</button>
        ))}
        <button className="btn !py-2" onClick={onClose}>Close (Esc)</button>
      </div>
      <div className="flex-1 min-h-0 bg-neutral-900 p-0">
        <iframe
          title="Full preview"
          sandbox="allow-scripts"
          srcDoc={withPreviewFix(html)}
          style={{ width: dev, maxWidth: "100%", height: "100%" }}
          className="mx-auto block w-full h-full bg-white border-0"
        />
      </div>
    </div>,
    document.body,
  );
}
