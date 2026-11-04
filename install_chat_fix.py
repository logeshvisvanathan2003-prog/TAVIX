#!/usr/bin/env python3
"""TAVIZ AI chat: no more scary 'Cannot reach the backend on port 8000' flash. Run from the TAVIX 9 folder:  python3 install_chat_fix.py ."""
import os,sys,shutil
ROOT=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else '.')
p=os.path.join(ROOT,'frontend','src','components','ChatPanel.jsx')
if not os.path.exists(p) or not os.path.isdir(os.path.join(ROOT,'backend','company_kb')):
    sys.exit('This is not the TAVIX company website (TAVIX 9) folder. Open the right folder and try again.')
os.makedirs(os.path.join(ROOT,'_backup_before_chat_fix'),exist_ok=True)
shutil.copy2(p,os.path.join(ROOT,'_backup_before_chat_fix','ChatPanel.jsx'))
t=open(p,encoding='utf-8').read()
EDITS=[
 ('const [pending, setPending] = useState(null),',
  'const [slow, setSlow] = useState(false);\n  useEffect(() => { if (online) { setSlow(false); return; } const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, [online]);\n  const [pending, setPending] = useState(null),'),
 ('retry = setTimeout(connect, 2500)','retry = setTimeout(connect, 700)'),
 ('{online ? "TAVIX-trained reasoning · your language" : "Reconnecting…"}','{online ? "TAVIZ-trained reasoning · your language" : (slow ? "Offline" : "Connecting…")}'),
 ('{online ? "TAVIZ-trained reasoning · your language" : "Reconnecting…"}','{online ? "TAVIZ-trained reasoning · your language" : (slow ? "Offline" : "Connecting…")}'),
 ('{!online && <p className="text-sm text-tavix-red">Cannot reach the Taviz backend on port 8000. Check that the backend window is running.</p>}',
  '{!online && slow && <p className="text-sm text-tavix-red">TAVIZ AI is not reachable right now. Please try again in a moment, or raise a support ticket below.</p>}'),
 ('{!online && <p className="text-sm text-tavix-red">Cannot reach the Tavix backend on port 8000. Check that the backend window is running.</p>}',
  '{!online && slow && <p className="text-sm text-tavix-red">TAVIZ AI is not reachable right now. Please try again in a moment, or raise a support ticket below.</p>}'),
]
for a,b in EDITS:
    if a in t and not (a==EDITS[0][0] and 'const [slow' in t):
        t=t.replace(a,b)
open(p,'w',encoding='utf-8').write(t)
ok=('const [slow' in t) and ('Cannot reach' not in t) and ('Connecting…' in t)
if not ok: sys.exit('PROBLEM: the chat file looks different from what I expected. Send me ChatPanel.jsx.')
print('Done. Chat now shows "Connecting…" and only shows a message if it is really offline for 8 seconds.')
