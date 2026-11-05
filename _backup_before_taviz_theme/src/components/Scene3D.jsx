import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const LAYERS = ["client", "api", "ai", "data", "blockchain", "hardware"];
const COLOR = { client: 0xe10600, api: 0xffffff, ai: 0xff5a4f, data: 0x9a9a9a, blockchain: 0xb80000, hardware: 0xffd0cc };

function label(text) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d");
  x.font = "600 44px Rajdhani, sans-serif"; x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText(text, 256, 62);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })); s.scale.set(3.2, 0.6, 1); return s;
}

// Interactive 3D map of the client's system: drag to rotate, scroll to zoom, glowing packets show data flow.
export default function Scene3D({ scene: data }) {
  const box = useRef();
  useEffect(() => {
    const el = box.current, W = () => el.clientWidth, H = () => el.clientHeight;
    const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(W(), H()); r.setPixelRatio(Math.min(devicePixelRatio, 2)); el.appendChild(r.domElement);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x0a0a0a); sc.fog = new THREE.Fog(0x0a0a0a, 14, 34);
    const cam = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 100); cam.position.set(9, 6, 11);
    const ctl = new OrbitControls(cam, r.domElement); ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2; ctl.enableDamping = true;
    sc.add(new THREE.AmbientLight(0xffffff, 0.7)); const pl = new THREE.PointLight(0xe10600, 60, 40); pl.position.set(0, 8, 0); sc.add(pl);
    const grid = new THREE.GridHelper(24, 24, 0xe10600, 0x333333); grid.position.y = -2.2; sc.add(grid);

    const nodes = data?.nodes || [], pos = {}, byLayer = {};
    nodes.forEach((n) => { const L = LAYERS.includes(n.layer) ? n.layer : "api"; (byLayer[L] ||= []).push(n); });
    const used = LAYERS.filter((l) => byLayer[l]);
    used.forEach((L, li) => byLayer[L].forEach((n, i, arr) => {
      const a = (i / arr.length) * Math.PI * 2, rad = arr.length === 1 ? 0 : 2.6 + arr.length * 0.15;
      const p = new THREE.Vector3(Math.cos(a) * rad, (used.length / 2 - li) * 2.2, Math.sin(a) * rad); pos[n.id] = p;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: COLOR[L], metalness: 0.4, roughness: 0.35, emissive: COLOR[L], emissiveIntensity: 0.15 }));
      m.position.copy(p); sc.add(m); const l = label(n.label); l.position.set(p.x, p.y + 0.95, p.z); sc.add(l);
    }));
    const flows = [];
    (data?.edges || []).forEach(([a, b]) => {
      if (!pos[a] || !pos[b]) return;
      sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pos[a], pos[b]]), new THREE.LineBasicMaterial({ color: 0xe10600, transparent: true, opacity: 0.55 })));
      const pk = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffffff })); sc.add(pk); flows.push({ a: pos[a], b: pos[b], pk, t: Math.random() });
    });
    let raf; const loop = () => { flows.forEach((f) => { f.t = (f.t + 0.006) % 1; f.pk.position.lerpVectors(f.a, f.b, f.t); }); ctl.update(); r.render(sc, cam); raf = requestAnimationFrame(loop); }; loop();
    const ro = new ResizeObserver(() => { r.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); }); ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); r.dispose(); el.removeChild(r.domElement); };
  }, [data]);
  return (<div>
    <div ref={box} className="w-full h-[420px] cut" role="img" aria-label="3D architecture of the requested system" />
    <div className="mt-2 flex flex-wrap gap-3 text-sm">{LAYERS.map((l) => <span key={l} className="flex items-center gap-1"><i className="w-3 h-3 inline-block" style={{ background: "#" + COLOR[l].toString(16).padStart(6, "0"), border: "1px solid #0003" }} />{l}</span>)}<span className="text-black/50">Drag to rotate · scroll to zoom</span></div>
  </div>);
}
