import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../api";
import { getStored, setStored } from "../storage.js";
import { useAuth } from "../auth.jsx";
import { award } from "../gamify.js";
import { setCurrentChatSessionId } from "../chatSessions.js";
import { Md, Typed } from "./Markdown.jsx";
import WingMark from "./WingMark.jsx";

const LANGS = [["en-IN", "EN"], ["ta-IN", "தமிழ்"], ["hi-IN", "हिन्दी"], ["te-IN", "తెలుగు"], ["ml-IN", "മലയാളം"], ["es-ES", "ES"]];
const plain = (t) => t.replace(/[*`#_]/g, "").replace(/^\s*[-•]\s+/gm, "");
const SUPPORT_INTENT = /\b(complaint|complain|raise (?:a )?ticket|support ticket|report (?:an? )?(?:issue|bug|problem)|file (?:a )?complaint|open (?:a )?ticket)\b/i;

function ChatBg() {
  return (
    <div className="cb" aria-hidden="true">
      <span className="cb-grid" /><span className="cb-scan" /><span className="cb-orb a" /><span className="cb-orb b" />
      <div className="cb-logo">
        <img className="cb-w l" src="/logo-wl.png" alt="" /><img className="cb-w r" src="/logo-wr.png" alt="" />
        {["t", "a", "v", "i", "z"].map((k, i) => <img key={k} className={"cb-l" + (k === "z" ? " z" : "")} style={{ "--i": i }} src={`/logo-${k}-l.png`} alt="" />)}
      </div>
    </div>
  );
}

function Thinking({ status, mission }) {
  const phrases = mission ? ["Reading your mission…", "Checking the requirements…", "Thinking it through…", "Writing the answer…"] : ["Reading your question…", "Checking what TAVIZ knows…", "Writing the answer…"];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % phrases.length), 1800); return () => clearInterval(t); }, []);
  return <div className="fade-up flex gap-3 items-start">
    <div className="orb shrink-0 scale-75 -ml-1" />
    <div className="flex-1 pt-1"><p key={i} className="fade-up text-sm text-white/80">{status || phrases[i]}</p>
      <div className="mt-2 space-y-1.5">{[90, 70, 45].map((w, k) => <div key={k} className="h-2.5 shimmer" style={{ width: w + "%", animationDelay: k * 150 + "ms" }} />)}</div></div></div>;
}

// variant: "panel" (floating widget) | "overlay" (expanded) | "page" (full /chat page)
export default function ChatPanel({ mission, sessionId, variant = "panel", onClose, onExpand }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]), [text, setText] = useState(""), [busy, setBusy] = useState(false), [online, setOnline] = useState(false);
  const [lang, setLang] = useState("en-IN"), [listening, setListening] = useState(false), [status, setStatus] = useState(""), [err, setErr] = useState(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (online) { setSlow(false); return; } const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, [online]);
  const [pending, setPending] = useState(null), [speak, setSpeak] = useState(getStored("tavix_speak") === "1"), [note, setNote] = useState("");
  const [ticketDraft, setTicketDraft] = useState(null), [ticketError, setTicketError] = useState(""), [ticketBusy, setTicketBusy] = useState(false);
  const navigate = useNavigate();
  const ws = useRef(), box = useRef(), rec = useRef(), lastUser = useRef(""), speakRef = useRef(speak), langRef = useRef(lang), msgsRef = useRef([]);
  speakRef.current = speak; langRef.current = lang; msgsRef.current = msgs;

  const stick = () => { const b = box.current; if (b && b.scrollHeight - b.scrollTop - b.clientHeight < 160) b.scrollTop = b.scrollHeight; };
  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs.length, busy, err]);

  const hello = mission ? `I'm Taviz AI — TAVIZ's own reasoning partner, not a generic chat wrapper. Mission #${mission} is open. Ask about the requirements, the themed prototype, the 3D map, or the ZIP you can open in VS Code.`
    : "I'm TAVIZ AI. Ask me about TAVIZ, our founder, careers and how we hire, our products like ONE TAVIZ AI, or how to use these websites.";

  useEffect(() => {
    let closed = false, retry;
    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const chatSession = sessionId || globalThis.crypto?.randomUUID?.().replace(/-/g, "") || `${Date.now()}${Math.random().toString(36).slice(2)}`;
      if (!sessionId) setCurrentChatSessionId(chatSession);
      const s = new WebSocket(`${proto}://${location.host}/ws/chat?session=${encodeURIComponent(chatSession)}${mission ? "m" + mission : ""}&token=${getToken() || ""}${mission ? "&mission=" + mission : ""}`);
      ws.current = s;
      s.onopen = () => setOnline(true);
      s.onclose = () => { setOnline(false); setBusy(false); if (!closed) retry = setTimeout(connect, 700); };
      s.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "history") setMsgs(m.messages.length ? m.messages : [{ role: "assistant", content: hello }]);
        if (m.type === "status") setStatus(m.text);
        if (m.type === "token") { setStatus(""); setMsgs((x) => { const l = x[x.length - 1]; return l?.live ? [...x.slice(0, -1), { ...l, content: l.content + m.text }] : [...x, { role: "assistant", content: m.text, live: true }]; }); }
        if (m.type === "booking") setMsgs((x) => [...x, { role: "system", content: `Booking #${m.id} placed. Taviz AI is already building it. Watch it live in My missions.` }]);
        if (m.type === "ticket") setMsgs((x) => [...x, { role: "system", content: `Support ticket #${m.id} has been sent to the TAVIZ team.`, ticketId: m.id }]);
        if (m.type === "error") { setErr(m.text); setMsgs((x) => x.filter((y) => !(y.live && !y.content.trim()))); }
        if (m.type === "done") {
          window.dispatchEvent(new Event("tavix:chat-updated"));
          setBusy(false); setStatus("");
          setMsgs((x) => { const out = x.map((y) => ({ ...y, live: false })); const l = out[out.length - 1];
            if (speakRef.current && l?.role === "assistant" && "speechSynthesis" in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(plain(l.content)); u.lang = langRef.current; speechSynthesis.speak(u); }
            return out; });
        }
      };
    };
    connect(); return () => { closed = true; clearTimeout(retry); ws.current?.close(); speechSynthesis?.cancel?.(); rec.current?.abort?.(); };
  }, [user, mission, sessionId]);

  const send = (t = text, again = false) => {
    t = t.trim();
    if (!t || busy || !online || ws.current?.readyState !== 1) return;
    setPending(null); setErr(null); setNote(""); speechSynthesis?.cancel?.();
    if (!again) setMsgs((x) => [...x, { role: "user", content: t }]);
    lastUser.current = t; setText(""); setBusy(true); setStatus(""); ws.current.send(t); award("chat-first", 20, "Talked to Taviz AI");
    window.dispatchEvent(new Event("tavix:chat-updated"));
    if (user && !again && SUPPORT_INTENT.test(t)) {
      setTicketDraft({
        subject: t.slice(0, 200),
        message: t.slice(0, 3000),
        category: mission ? "build" : "general",
      });
      setTicketError("");
    }
  };
  const submitTicket = async (e) => {
    e.preventDefault();
    if (!ticketDraft || ticketBusy) return;
    setTicketBusy(true); setTicketError("");
    try {
      const ticket = await api("/tickets", {
        method: "POST",
        body: {
          subject: ticketDraft.subject,
          message: ticketDraft.message,
          category: ticketDraft.category,
          priority: "normal",
          booking_id: mission ? Number(mission) : null,
        },
      });
      award("ticket-first", 30, "Raised a support ticket");
      setTicketDraft(null);
      setMsgs((current) => [...current, {
        role: "system",
        content: `Support ticket #${ticket.id} has been sent to the TAVIZ team. You can follow the conversation in My missions > Support tickets.`,
        ticketId: ticket.id,
      }]);
    } catch (error) {
      setTicketError(error.message);
    } finally {
      setTicketBusy(false);
    }
  };
  const openSupportTicket = (ticketId) => navigate(`/?tab=tickets&ticket=${ticketId}#client-missions`);

  // Voice: live transcript goes into the box; ONE message is sent after you stop speaking, with a short chance to cancel.
  const mic = () => {
    if (listening) return rec.current?.stop();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return setNote("Voice input is not supported in this browser. Try Chrome or Edge.");
    speechSynthesis?.cancel?.(); setErr(null); setNote(""); setPending(null);
    const r = new SR(); r.lang = lang; r.interimResults = true; r.continuous = false; let finalT = "";
    r.onstart = () => { setListening(true); setText(""); award("voice-first", 25, "Used voice input"); };
    r.onresult = (e) => { let fin = "", interim = ""; for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (interim += e.results[i][0].transcript)); finalT = fin; setText((fin + interim).trim()); };
    r.onerror = (e) => { setListening(false); if (e.error === "not-allowed") setNote("Microphone is blocked. Allow it from the lock icon in the address bar."); else if (e.error === "no-speech") setNote("I did not hear anything. Tap the mic and try again."); };
    r.onend = () => { setListening(false); const v = (finalT || "").trim(); if (v) setPending(v); };
    rec.current = r; r.start();
  };
  useEffect(() => { if (!pending) return; const t = setTimeout(() => send(pending), 1800); return () => clearTimeout(t); }, [pending]);

  const chips = useMemo(() => mission ? ["Summarise what you built", "List the key features", "What are the risks?", "How do I request a change?"]
    : ["What is TAVIZ AI and ONE TAVIZ AI?", "How does TAVIZ hire?", "What roles are open?", "Who founded TAVIZ?"], [mission]);
  const only = msgs.length <= 1 && !busy;
  const wrap = { panel: "fixed z-50 bottom-24 right-3 left-3 sm:left-auto sm:right-5 sm:w-[420px] h-[72vh] max-h-[660px]", overlay: "fixed z-50 inset-3 sm:inset-8 sm:max-w-4xl sm:mx-auto", page: "relative h-full w-full max-w-3xl mx-auto" }[variant];
  const big = variant !== "panel";

  return (
    <section className={wrap + " bg-black text-white flex flex-col cut border border-tavix-red/60 animate-pop cb-panel " + (big ? "text-lg" : "") + (variant === "page" ? ` workspace-chat-panel ${only ? "is-welcome" : "is-conversation"}` : "")}>
      <ChatBg />
      <header className="relative z-[1] flex items-center gap-3 p-4 border-b border-white/15 cb-head-bar">
        <span className="cb-head"><WingMark className="w-9" /></span><div className="flex-1 min-w-0"><h3 className="text-xs">TAVIZ AI</h3>
          <p className="text-sm text-white/60 truncate"><span className={"inline-block w-2 h-2 mr-1.5 " + (online ? "bg-green-400" : "bg-tavix-red animate-pulse")} />{mission ? `Mission #${mission} · ` : ""}{online ? "TAVIZ-trained reasoning · your language" : (slow ? "Offline" : "Connecting…")}</p></div>
        <button onClick={() => { const v = !speak; setSpeak(v); setStored("tavix_speak", v ? "1" : "0"); if (!v) speechSynthesis?.cancel?.(); }} aria-pressed={speak} title="Read answers aloud"
          className={"px-2 py-1 border text-sm " + (speak ? "bg-tavix-red border-tavix-red" : "border-white/25 text-white/70")}>{speak ? "🔊 On" : "🔈 Off"}</button>
        {variant !== "page" && onExpand && <button onClick={onExpand} aria-label="Expand" className="text-white/60 hover:text-white px-1">{variant === "overlay" ? "⤡" : "⤢"}</button>}
        {onClose && <button onClick={onClose} aria-label="Close" className="text-white/60 hover:text-white px-1">✕</button>}
      </header>

      <div ref={box} className="relative z-[1] flex-1 overflow-y-auto thin-scroll p-4 space-y-4">
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="flex justify-end fade-up"><p className="max-w-[85%] px-4 py-2.5 whitespace-pre-wrap cut-sm bg-tavix-red cb-user">{m.content}</p></div>
          : m.role === "system" ? <div key={i} className="fade-up bg-white text-black font-semibold px-4 py-2.5 cut-sm"><p>{m.content}</p>{m.ticketId && <button className="mt-2 text-tavix-red underline" onClick={() => openSupportTicket(m.ticketId)}>Open support ticket #{m.ticketId}</button>}</div>
          : <div key={i} className="flex gap-3 fade-up"><WingMark className="w-6 shrink-0 mt-1.5 opacity-80" />
              <div className="min-w-0 max-w-[92%] bg-white/10 px-4 py-3 cut-sm cb-bot">{m.live ? <Typed text={m.content} live onTick={stick} /> : <Typed text={m.content} live={false} />}</div></div>)}
        {ticketDraft && <form onSubmit={submitTicket} className="fade-up border border-tavix-red/60 bg-white/5 p-4 space-y-3">
          <div className="flex items-center gap-2"><h4 className="font-display text-xs flex-1">SEND TO TAVIZ SUPPORT</h4><button type="button" className="text-white/60" onClick={() => { setTicketDraft(null); setTicketError(""); }}>Cancel</button></div>
          <p className="text-sm text-white/70">This creates a private support ticket that the team can read and reply to in Admin &gt; Tickets.</p>
          <input required minLength={3} maxLength={200} className="input" placeholder="Short subject" value={ticketDraft.subject} onChange={(e) => setTicketDraft({ ...ticketDraft, subject: e.target.value })} />
          <select className="input" value={ticketDraft.category} onChange={(e) => setTicketDraft({ ...ticketDraft, category: e.target.value })}>
            {[["general", "General support"], ["build", "AI build issue"], ["bug", "Something is broken"], ["feature", "Feature request"], ["billing", "Billing"]].map(([value, label]) => <option key={value} value={value} className="text-black">{label}</option>)}
          </select>
          <textarea required minLength={3} maxLength={3000} rows={4} className="input" placeholder="Describe the issue and what you expected…" value={ticketDraft.message} onChange={(e) => setTicketDraft({ ...ticketDraft, message: e.target.value })} />
          {ticketError && <p role="alert" className="text-sm text-tavix-red">{ticketError}</p>}
          <button className="btn !py-2" disabled={ticketBusy}>{ticketBusy ? "Sending ticket…" : "Submit support ticket"}</button>
        </form>}
        {busy && !msgs[msgs.length - 1]?.live && <Thinking status={status} mission={mission} />}
        {busy && status && msgs[msgs.length - 1]?.live && <p className="text-sm text-amber-300 fade-up">{status}</p>}
        {err && <div className="fade-up border border-tavix-red bg-tavix-red/10 p-3" role="alert"><p className="text-sm">{err}</p>
          <button className="btn !py-2 !px-4 mt-2" onClick={() => send(lastUser.current, true)} disabled={busy}>Try again</button></div>}
        {only && <div className="flex flex-wrap gap-2 fade-up">{chips.map((c) => <button key={c} onClick={() => send(c)} className="px-3 py-1.5 text-sm border border-white/25 hover:bg-tavix-red hover:border-tavix-red transition cut-sm">{c}</button>)}</div>}
        {!online && slow && <p className="text-sm text-tavix-red">TAVIZ AI is not reachable right now. Please try again in a moment, or raise a support ticket below.</p>}
      </div>

      <div className="relative z-[1] p-3 border-t border-white/15 space-y-2 cb-foot">
        {user && !ticketDraft && <button className="text-sm text-white/70 underline hover:text-white" onClick={() => {
          const complaint = lastUser.current.trim();
          setTicketDraft({ subject: "", message: complaint.length >= 3 ? complaint.slice(0, 3000) : "", category: mission ? "build" : "general" });
          setTicketError("");
        }}>Raise a support ticket</button>}
        {!user && <p className="text-sm text-white/60">Log in to chat or submit a support ticket.</p>}
        <div className="flex gap-1 overflow-x-auto thin-scroll">{LANGS.map(([c, l]) => <button key={c} onClick={() => setLang(c)} className={"px-2 py-1 text-sm shrink-0 border " + (lang === c ? "bg-tavix-red border-tavix-red" : "border-white/20")}>{l}</button>)}</div>
        {listening && <div className="flex items-center gap-3 text-sm text-white/80 fade-up"><span className="wave">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} style={{ animationDelay: i * 90 + "ms" }} />)}</span>Listening… speak now, tap the mic to finish</div>}
        {pending && <div className="flex items-center justify-between gap-2 text-sm bg-white/10 px-3 py-2 fade-up"><span>Sending in a moment…</span>
          <span className="flex gap-2"><button className="underline" onClick={() => send(pending)}>Send now</button><button className="underline text-white/70" onClick={() => setPending(null)}>Edit first</button></span></div>}
        {note && <p className="text-sm text-amber-300">{note}</p>}
        <div className="flex gap-2 items-end">
          <textarea rows={1} className="input resize-none max-h-28" value={text} onChange={(e) => { setText(e.target.value); setPending(null); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={listening ? "Listening…" : "Type or speak your problem…"} lang={lang} />
          <button onClick={mic} aria-label="Voice input" className={"px-3 py-3 border " + (listening ? "bg-tavix-red border-tavix-red glow" : "border-white/30 hover:border-tavix-red")}>🎙</button>
          <button onClick={() => send()} disabled={busy || !online || !text.trim()} className="btn !px-4 !py-3">Send</button>
        </div>
      </div>
    </section>
  );
}
