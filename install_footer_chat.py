#!/usr/bin/env python3
"""TAVIZ company website: new footer + animated TAVIZ AI chat (includes the chat 'Connecting...' fix).
Run from the TAVIX 9 folder:  python3 install_footer_chat.py ."""
import os,sys,shutil
ROOT=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else '.')
S=os.path.join(ROOT,'frontend','src')
F={'home':os.path.join(S,'pages','Home.jsx'),'co':os.path.join(S,'data','company.js'),'chat':os.path.join(S,'components','ChatPanel.jsx'),'css':os.path.join(S,'index.css')}
if not all(os.path.exists(p) for p in F.values()) or not os.path.isdir(os.path.join(ROOT,'backend','company_kb')):
    sys.exit('This is not the TAVIX company website (TAVIX 9) folder. Open the right folder and try again.')
BK=os.path.join(ROOT,'_backup_before_footer_chat'); os.makedirs(BK,exist_ok=True)
for k,p in F.items(): shutil.copy2(p,os.path.join(BK,os.path.basename(p)))
rd=lambda p:open(p,encoding='utf-8').read()
def wr(p,t): open(p,'w',encoding='utf-8').write(t)
problems=[]
def rep(t,a,b,name,already=None):
    if already and already in t: return t
    if a not in t: problems.append(name); return t
    return t.replace(a,b)

# ---- footer ----
h=rd(F['home'])
old_logo='<div><div className="w-28 bg-white p-1"><AnimLogo /></div><p className="mt-3 text-white/60 text-sm">{COMPANY.legal}</p><p className="font-display text-[10px] mt-2 text-tavix-red">{COMPANY.motto.toUpperCase()}</p></div>'
new_logo='<div><div className="w-44"><AnimLogo light /></div><p className="mt-3 text-white/80 text-sm tracking-wide">TAVIZ AI TECHNOLOGIES SOLUTIONS</p><p className="font-display text-[10px] mt-2 text-tavix-red">INNOVATION WITH HONOUR</p></div>'
h=rep(h,old_logo,new_logo,'footer left',already='TAVIZ AI TECHNOLOGIES SOLUTIONS')
old_c='<div><h3 className="text-xs">CONTACT</h3><p className="mt-3 text-white/70">Founder & CEO: Logesh Visvanathan</p><a className="text-tavix-red" href={"mailto:" + COMPANY.email}>{COMPANY.email}</a></div>'
new_c='<div><h3 className="text-xs">CONTACT</h3><p className="mt-3 text-white/70">FOUNDER &amp; CEO</p><p className="text-white/90 tracking-wide">LOGESH VISVANATHAN</p><p className="mt-2 text-white/70">MOBILE: <a className="text-tavix-red" href="tel:+916381975196">6381975196</a></p><p className="text-white/70">EMAIL: <a className="text-tavix-red" href="mailto:taviz.ai@gmail.com">taviz.ai@gmail.com</a></p></div>'
h=rep(h,old_c,new_c,'footer contact',already='6381975196')
wr(F['home'],h)
co=rd(F['co']); co=co.replace('email: "logesh@tavix.in"','email: "taviz.ai@gmail.com"'); wr(F['co'],co)

# ---- chat ----
t=rd(F['chat'])
if 'const [slow' not in t:
    t=rep(t,'const [pending, setPending] = useState(null),','const [slow, setSlow] = useState(false);\n  useEffect(() => { if (online) { setSlow(false); return; } const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, [online]);\n  const [pending, setPending] = useState(null),','slow state')
t=t.replace('retry = setTimeout(connect, 2500)','retry = setTimeout(connect, 700)')
for a in ('"TAVIX-trained reasoning · your language" : "Reconnecting…"','"TAVIZ-trained reasoning · your language" : "Reconnecting…"'):
    t=t.replace('{online ? '+a+'}','{online ? "TAVIZ-trained reasoning · your language" : (slow ? "Offline" : "Connecting…")}')
for w in ('Taviz','Tavix'):
    t=t.replace('{!online && <p className="text-sm text-tavix-red">Cannot reach the %s backend on port 8000. Check that the backend window is running.</p>}'%w,
                '{!online && slow && <p className="text-sm text-tavix-red">TAVIZ AI is not reachable right now. Please try again in a moment, or raise a support ticket below.</p>}')
if 'function ChatBg' not in t:
    bg='''function ChatBg() {
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

'''
    t=rep(t,'function Thinking(',bg+'function Thinking(','Thinking anchor')
t=rep(t,'\n      <header className="flex items-center gap-3 p-4 border-b border-white/15">','\n      <ChatBg />\n      <header className="relative z-[1] flex items-center gap-3 p-4 border-b border-white/15 cb-head-bar">','header',already='<ChatBg />')
t=rep(t,'<WingMark className="w-9" />','<span className="cb-head"><WingMark className="w-9" /></span>','head logo',already='cb-head"')
t=rep(t,'<div ref={box} className="flex-1 overflow-y-auto','<div ref={box} className="relative z-[1] flex-1 overflow-y-auto','scroll box',already='relative z-[1] flex-1 overflow-y-auto')
t=rep(t,'<div className="p-3 border-t border-white/15 space-y-2">','<div className="relative z-[1] p-3 border-t border-white/15 space-y-2 cb-foot">','footer bar',already='cb-foot')
t=rep(t,'cut-sm bg-tavix-red">{m.content}','cut-sm bg-tavix-red cb-user">{m.content}','user bubble',already='cb-user')
t=rep(t,'bg-white/10 px-4 py-3 cut-sm">','bg-white/10 px-4 py-3 cut-sm cb-bot">','bot bubble',already='cb-bot')
t=rep(t,'animate-pop " + (big','animate-pop cb-panel " + (big','panel class',already='cb-panel')
wr(F['chat'],t)
if 'Cannot reach' in t or 'const [slow' not in t: problems.append('chat fix not applied')

# ---- css ----
css=rd(F['css'])
if 'TAVIZ chat v33' not in css:
    css+='''

/* ===== TAVIZ chat v33: animated logo background, glow, motion ===== */
.cb{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.cb-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(225,6,0,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(225,6,0,.07) 1px,transparent 1px);background-size:34px 34px;-webkit-mask-image:radial-gradient(circle at 50% 45%,#000 0,transparent 72%);mask-image:radial-gradient(circle at 50% 45%,#000 0,transparent 72%);animation:cbGrid 14s linear infinite}
.cb-scan{position:absolute;left:0;right:0;height:90px;top:-90px;background:linear-gradient(180deg,transparent,rgba(225,6,0,.16),transparent);animation:cbScan 6.5s ease-in-out infinite}
.cb-orb{position:absolute;width:220px;height:220px;border-radius:50%;filter:blur(46px);opacity:.34}
.cb-orb.a{left:-60px;top:12%;background:radial-gradient(circle,#E10600,transparent 70%);animation:cbOrbA 9s ease-in-out infinite}
.cb-orb.b{right:-70px;bottom:6%;background:radial-gradient(circle,#ff5a4d,transparent 70%);animation:cbOrbB 11s ease-in-out infinite}
.cb-logo{position:absolute;left:50%;top:50%;width:94%;aspect-ratio:868/444;transform:translate(-50%,-50%);opacity:.2;animation:cbFloat 7s ease-in-out infinite}
.cb-logo img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.cb-w.l{animation:cbWl 5.5s ease-in-out infinite}
.cb-w.r{animation:cbWr 5.5s ease-in-out infinite}
.cb-l{animation:cbLetter 4.4s ease-in-out infinite;animation-delay:calc(var(--i) * .28s)}
.cb-l.z{animation:cbZ 2.8s ease-in-out infinite}
.cb-panel{animation:pop .5s ease-out both,cbBorder 3.2s ease-in-out infinite}
.cb-head{display:inline-block;filter:drop-shadow(0 0 8px rgba(225,6,0,.65));animation:cbPulse 2.4s ease-in-out infinite}
.cb-head-bar{background:linear-gradient(90deg,rgba(225,6,0,.16),transparent 55%)}
.cb-foot{background:linear-gradient(0deg,rgba(0,0,0,.55),transparent)}
.cb-bot{position:relative;overflow:hidden;backdrop-filter:blur(3px);border-left:2px solid rgba(225,6,0,.8)}
.cb-bot::after{content:"";position:absolute;top:0;bottom:0;width:60%;left:-70%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.12),transparent);animation:cbSheen 1.1s ease-out .15s 1 both}
.cb-user{background-image:linear-gradient(120deg,#E10600,#a30000);box-shadow:0 0 18px rgba(225,6,0,.35);animation:cbPop .35s cubic-bezier(.2,.9,.3,1.2) both}
.cb-panel button:hover{filter:drop-shadow(0 0 6px rgba(225,6,0,.7))}
@keyframes cbGrid{to{background-position:34px 34px}}
@keyframes cbScan{0%{top:-90px;opacity:0}15%{opacity:1}85%{opacity:1}100%{top:100%;opacity:0}}
@keyframes cbOrbA{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,70px)}}
@keyframes cbOrbB{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,-60px)}}
@keyframes cbFloat{0%,100%{transform:translate(-50%,-50%) translateY(-7px) scale(1)}50%{transform:translate(-50%,-50%) translateY(7px) scale(1.03)}}
@keyframes cbWl{0%,100%{transform:translateX(-5px);opacity:.7}50%{transform:translateX(3px);opacity:1}}
@keyframes cbWr{0%,100%{transform:translateX(5px);opacity:.7}50%{transform:translateX(-3px);opacity:1}}
@keyframes cbLetter{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes cbZ{0%,100%{opacity:.7;filter:drop-shadow(0 0 0 rgba(225,6,0,0))}50%{opacity:1;filter:drop-shadow(0 0 14px rgba(255,40,30,.95))}}
@keyframes cbBorder{0%,100%{border-color:rgba(225,6,0,.35)}50%{border-color:rgba(255,60,50,.95)}}
@keyframes cbPulse{0%,100%{filter:drop-shadow(0 0 5px rgba(225,6,0,.5))}50%{filter:drop-shadow(0 0 14px rgba(255,40,30,.95))}}
@keyframes cbSheen{to{left:120%}}
@keyframes cbPop{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.cb *,.cb-panel,.cb-head,.cb-bot::after,.cb-user{animation:none!important}}
'''
    wr(F['css'],css)
if problems: sys.exit('PROBLEM: could not update: '+', '.join(problems)+'. Send me those files.')
print('Done. Footer updated and the chat has the animated TAVIZ logo. Now build and deploy.')
