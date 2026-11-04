# TAVIZ Platform Documentation

Founder & CEO: Logesh Visvanathan. Motto: Innovation with Honour.

## 1. What this is
A full-stack website for TAVIZ, an IT startup solving automobile-industry problems with software, hardware+software, AI/ML and blockchain. Clients register, book a "mission" (a problem to solve), and Taviz AI builds a requirements document, a website prototype and a 3D architecture map for them. The founder runs everything from a separate admin Command Centre.

Status: working locally on your MacBook. It has not been deployed to the internet, load-tested or security-audited. Built websites are drafts with sample data until an engineer reviews them.

## 2. Architecture
- **Frontend:** React 18, Vite, Tailwind CSS, React Router, three.js (3D view). Runs on http://localhost:5173 (or 5174).
- **Backend:** Python FastAPI (port 8000), SQLAlchemy, JWT login, WebSocket for chat. 
- **Database:** PostgreSQL (database, user and password all `tavix` by default).
- **Brain (AI model):** either the Claude API (paid, strongest) or a local open model served by MLX on your Mac (free, port 8080). Chosen with `TAVIX_LLM_BACKEND` in `.env`.

Flow: client books -> backend saves it -> builder asks the model for (1) requirements JSON, (2) a website prototype in HTML, (3) a 3D architecture graph -> client watches progress in My missions -> admin reviews, corrects and writes the final solution.

## 3. Folder structure
- `frontend/` React app. `src/pages` (Home, Auth, Dashboard, Admin, AdminLogin), `src/components` (Navbar, XPBar, ChatWidget, Scene3D, Particles, Reveal, WingMark, Safe), `src/gamify.js`, `src/api.js`, `src/auth.jsx`.
- `backend/` `main.py` (API), `models.py` (tables), `ai.py` (Taviz AI chat), `builder.py` (mission builder), `llm.py` (Claude or local model), `reset_admin.py`.
- `ml/` model training kit: `free/` (Mac + Kaggle), `cloud/` (rented GPU), `export_dataset.py`.
- `docs/` this document. `docker-compose.yml`, `.env.example`.

## 4. Frontend
**Design:** your logo's red (#E10600), black and white; Michroma headings and Rajdhani body text; angular clipped corners that echo the logo's slanted cuts; animated particle network, tilt cards, scroll reveals.

**Public pages (route `/`):** Hero with live counters; Sectors (web development and testing, AI and ML, blockchain, automotive software, hardware + software) with "Accept mission"; Project transparency (Delivered / In progress / Upcoming with progress bars, start date, ratings); live Client feed (auto-scrolling, refreshes every 15 s); Founder; Booking form.

**Client pages:** `/login`, `/register`, `/dashboard` (My missions).

**Admin pages (separate shell, no client navbar or chat):** `/admin/login` and `/admin`. Non-admin accounts cannot use the admin login, and admin accounts cannot use the client login.

**Gamification:** scroll progress bar; XP for discovering sections (+10), launching a mission (+100), finishing feedback (+50), a finished AI build (+50); ranks Scout -> Builder -> Engineer -> Architect -> Pioneer -> Legend; badges on My missions (First mission, Builder, Shipped, Multi-sector). XP is stored in the browser and each reward can be earned once.

**Mandatory feedback:** opening a delivered project shows its result and reviews, and the window cannot be closed until a logged-in client submits a rating and comment (one review per client per project). This is an interface rule, not a security control.

**My missions / Build Studio:** per mission it shows status, the team's written solution, an AI-engine health badge, live build steps, then Taviz AI's response (summary and key features) and four tabs: Website (desktop/tablet/phone preview in a sandboxed frame, full screen), 3D view (drag to rotate, glowing data packets), Requirements (modules, compliance, risks, milestones) and Request changes (rebuilds with the client's note). "Ask Taviz AI about this" opens the chat with that mission's context. A failed build shows the reason and a Retry button.

**Taviz AI chat widget:** floating button; real-time streaming over WebSocket; replies in the client's language; language chips and microphone (browser speech recognition, Chrome/Edge); remembers the conversation; shows offline and slow-model hints.

## 5. Backend
**Database tables:** `users` (name, email, password hash, role client/admin), `projects` (title, sector, summary, tech, client, status, progress, result, sample flag), `feedback` (author, rating, message, project link, sample flag), `bookings` (sector, title, problem, budget, language, source form/tavix-ai, status placed/reviewing/in_progress/delivered, solution, spec, site_html, scene, build_status, build_log, build_error, build_provider, reviewed), `chat_messages` (session, role, content). Tables and new columns are created or added automatically at startup.

**API:**
- Auth: `POST /api/auth/register`, `/api/auth/login` (clients only), `/api/auth/admin-login`, `GET /api/auth/me`.
- Public: `GET /api/projects`, `GET /api/feedback?project_id=`, `GET /api/ai/health`.
- Client (logged in): `POST /api/feedback`, `GET /api/feedback/mine`, `POST /api/bookings`, `GET /api/bookings/mine`, `GET /api/bookings/{id}/build`, `POST /api/bookings/{id}/revise`, `POST /api/bookings/{id}/retry`.
- Admin: `GET /api/admin/stats|bookings|users|chats`, `PATCH /api/admin/bookings/{id}` (status, solution, reviewed, corrected spec/site), `POST /api/admin/bookings/{id}/rebuild`, `POST` and `PATCH /api/admin/projects`, `DELETE /api/admin/demo`.
- Chat: WebSocket `/ws/chat?token=&session=&mission=`.

**Security in place:** bcrypt password hashing, JWT tokens (7 days), role checks on every admin route, owner checks on missions, website prototypes shown in a sandboxed iframe with no access to the app.

**Builder (`builder.py`):** three steps with progress saved to the database; one build at a time (a local model handles one request); JSON replies retried once; failures store a readable reason; on backend start, missions stuck on queued/building are rebuilt automatically. Admin can inspect, correct (requirements JSON and website HTML), rebuild and mark "reviewed", which shows a badge to the client.

**Taviz AI chat (`ai.py`):** system prompt with TAVIZ facts and honesty rules (no invented prices or promises); asks one question at a time; with Claude it can place bookings and look up status through tools; with a local model it chats only (clients book with the form).

## 6. ML: your own Taviz AI
**Reality check:** you cannot train a strong model from scratch on a Mac. You fine-tune an open model on your own examples (LoRA). It learns TAVIZ's style and format; it does not become smarter than its base.

**Three brains:**
1. Claude API: strongest, paid. Set `ANTHROPIC_API_KEY`.
2. Free local (recommended start): `mlx-community/Qwen2.5-Coder-7B-Instruct-4bit` on your MacBook Air M5 (16 GB) via `mlx_lm server` on port 8080. Weaker on long website code.
3. Rented GPU: serve a 32B model with vLLM for stronger results. It is billed while running.

**Training paths:** free = Kaggle T4 notebook (`ml/free/tavix_kaggle_train.ipynb`, 7B model, merged and pushed to a private Hugging Face repo, then converted for MLX with `serve_mine.sh`). Paid = `ml/cloud/train_qlora.py` on an 80 GB GPU.

**Data rules:** you need 200+ builds that an engineer corrected in the admin panel and marked reviewed (1,000+ is better). Export with `python ml/export_dataset.py`. Never train on Claude's outputs (Anthropic's terms forbid it); the export script skips Claude-made builds. Remove client personal details before uploading data anywhere.

## 7. How to run
Three windows (PostgreSQL already runs in the background via Homebrew):
1. Model: `source ~/tavix-ml/bin/activate` then `python -m mlx_lm server --model mlx-community/Qwen2.5-Coder-7B-Instruct-4bit --port 8080`
2. Backend: `cd backend && source .venv/bin/activate && set -a; source ../.env; set +a && python -m uvicorn main:app --reload`
3. Website: `cd frontend && npm install && npm run dev`

`.env` for the free local brain: `TAVIX_LLM_BACKEND=local` and `LOCAL_LLM_URL=http://localhost:8080/v1/chat/completions`. Reset the admin password: `python reset_admin.py logesh@tavix.in 'NewPassword1'`.

## 8. Admin guide
Go to `/admin/login`. The Command Centre shows an AI-engine health badge, build counts, client/booking/AI-message totals and four tabs: Bookings (set status, write the solution the client sees, inspect/correct/rebuild AI builds, mark reviewed), Chats (every Taviz AI message), Clients, Projects (publish projects with results; remove the four sample projects before launch).

## 9. Troubleshooting (problems met while building this)
- Docker not running: use Homebrew PostgreSQL instead; Docker is optional.
- `Address already in use` on 8000: `lsof -ti tcp:8000 -sTCP:LISTEN | xargs kill`.
- `No module named httpx`: you ran the wrong Python; use `python -m uvicorn` inside the activated `.venv`.
- `must be owner of table`: tables were made by another database user; reassign ownership to `tavix`.
- Model download times out: set `HF_HUB_DOWNLOAD_TIMEOUT=120` and run `hf download <model>` again; it resumes.
- Model window prints nothing after start: normal; it loads on the first request (up to a minute).
- Chat crashed with "destroy is not a function": fixed in `ChatWidget.jsx` (v5).
- Build "failed": read the Reason on the mission page; check the AI-engine badge; start the model window; press Retry.
- Chat slow during a build: the local model answers one request at a time.

## 10. Security and privacy notes
Change `SECRET_KEY` and `ADMIN_PASSWORD` before real use. Serve over HTTPS in production and restrict CORS to your domain. Sample projects and feedback are labelled "Sample"; remove them before launch. Client requests are sent to Anthropic when using Claude, and training data goes to Kaggle/Hugging Face if you use them. State this in a privacy policy. The mlx_lm server is not meant for public internet use.

## 11. Known limitations
Not deployed; no email notifications; no payments; the AI-built websites are prototypes with sample data; a 7B local model often builds weaker pages than Claude; local-model chat cannot place bookings; mobile layout was written responsively but not tested on devices; the Kaggle/cloud training scripts and local-model build quality were not run by the assistant that wrote them, so expect small fixes.

## 12. Change log
- v1: site, auth, projects, client feed, booking, Taviz AI chat (Claude), admin panel, Docker/Postgres.
- v2: mandatory project feedback, XP/rank gamification, mission builder, Build Studio, 3D view, local-model switch, ML kit.
- v3: free path (Mac + Kaggle), cloud GPU scripts, admin build editor.
- v4: builder crash fixed, builds queue and auto-resume, retry button.
- v5: chat crash fixed; separate admin login and dashboard; AI-engine health badge; readable build errors; Taviz AI's response shown on the mission page; this documentation.


## v6 change: free Hugging Face brain and automatic .env loading
- `backend/config.py` loads `.env` itself (project root or backend/), so starting uvicorn without `source ../.env` no longer silently falls back to Claude.
- Set `TAVIX_LLM_BACKEND=local`, `LOCAL_LLM_URL=https://router.huggingface.co/v1/chat/completions`, `LOCAL_LLM_KEY=<hf token>`, `LOCAL_LLM_MODEL=Qwen/Qwen3-Coder-480B-A35B-Instruct`.
- `python backend/check_ai.py` tests the brain; the server prints the active brain at startup.
- Clearer model-server errors (401 token, 402 credit, 404 model name). `<think>` blocks are stripped from replies.
- The "Reviewed by TAVIZ" badge now shows only when the build finished and an engineer reviewed it.


## v7: live builds, smarter chat, tickets, admin monitoring
**Flow (no approval step):** client fills the booking form -> automatically taken to My missions -> Taviz AI builds immediately and the client watches it live
(requirements forming, the code being written, the website drawing itself, architecture nodes appearing) -> "Build complete" with confetti -> big
**Full screen preview** button (Esc to close). A TAVIZ engineer can still review later; that only adds a "Reviewed" badge.

**Chat fixes:** answers now type out smoothly with formatting (bold, bullet lists); a "thinking" animation shows while the model works; rate limits
(HTTP 429) are waited out automatically with a visible message instead of an error; errors are never saved into the conversation; voice input shows a
live transcript, sends ONE message after you stop talking (with Send now / Edit first), and answers can be read aloud (speaker button). Full page at `/chat`.

**Gamification:** quest map per mission (Launched, Requirements, Website, 3D map, Reviewed, Delivered) with XP per stage, rank-up celebration,
10 badges, XP toasts everywhere.

**Support tickets:** clients raise tickets from My missions (also one click from a failed build); admin replies, sets status and priority, can raise a
ticket on behalf of a client. Unread tickets are flagged on both sides.

**Admin Command Centre:** Overview (live build monitor, failed builds with Rebuild, activity feed), Missions (search and filters), Tickets inbox,
Clients (all registered users with missions, builds, tickets, AI chats, last activity; click for details), AI chats, Projects. Refreshes every 5 s.

New API: POST /api/tickets, GET /api/tickets/mine, GET/POST /api/tickets/{id}[/reply], GET/POST /api/admin/tickets, PATCH /api/admin/tickets/{id},
GET /api/admin/activity, GET /api/admin/users/{id}. New env: LOCAL_CHAT_MODEL (optional).
