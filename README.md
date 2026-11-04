# TAVIZ: Innovation with Honour

React + Tailwind frontend, FastAPI (Python) backend, PostgreSQL database, Taviz AI (free Hugging Face open model, local MLX model, or Claude API; streaming over WebSocket).

## Run it

1. `cp .env.example .env` and set `LOCAL_LLM_KEY` (free Hugging Face token), `SECRET_KEY`, `ADMIN_PASSWORD`. Then run `cd backend && python check_ai.py` to confirm the AI works. The backend now loads `.env` itself.
2. Start database + API: `docker compose up --build` (API on :8000, tables and admin created automatically).
3. Frontend: `cd frontend && npm install && npm run dev` then open http://localhost:5173

No Docker? Install PostgreSQL, create DB/user `tavix`, then in `backend/`:
`pip install -r requirements.txt && export $(cat ../.env | xargs) && uvicorn main:app --reload`

## Admin (Logesh Visvanathan)
Log in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (default email `logesh@tavix.in`). If admin requests show `403 Admin only`, sign out and authenticate again; if the configured admin password is no longer accepted, reset the configured admin account with `backend/reset_admin.py` and a new strong password. The admin panel shows clients,
bookings (form and Taviz AI), full chat logs, and lets you set each booking's status and the solution the client sees.
You can also publish projects there.

## Sample data
The first start adds 4 sample projects flagged "Sample". Use Admin > projects > "Remove sample data" before going live.
Client feedback is never pre-filled: only registered clients can post, so the feed stays real.

## Missions: Taviz AI builds for the client
When a client books (form or chat), `backend/builder.py` runs: requirements spec, an interactive website prototype, and a 3D architecture
map. The client can add a product domain and visual direction so the site is styled for their request, then watch it live in My missions >
Build Studio (Website / 3D view / Requirements / Request changes). Ready builds can be downloaded as a Vite project ZIP with setup instructions.
Build Studio also includes "Improve content & navigation" for regenerating an existing draft with fuller, more professional sections and working navigation.
Admin can inspect, rebuild, and tick "reviewed". A reviewed build can then be explicitly published or updated in Project Transparency;
client feedback is collected from real clients and is never fabricated. Builds are drafts with sample data.

## Client XP and visual upgrades
The final "Gamified" section on the homepage explains each XP action and its limit, shows rank progress and recent XP activity,
and lets clients unlock optional visual HUD and Build Studio effects. XP is stored in the current browser, does not sync across
devices, and cannot change project prices, support priority, or access to real project features.

## Mandatory feedback
Opening a delivered project in Project transparency locks the window until a logged-in client submits a rating and comment
(one review per client per project). This is a UX gate, not a security control.

## Free path (recommended start)
Follow `ml/free/FREE_PATH_STEPS.md`: free local model now, Kaggle free GPU training later.

## Own model on your Mac
See `ml/README_TRAINING.md`.

## Upgrading from v1
Existing databases are migrated automatically on start (new columns added with `ADD COLUMN IF NOT EXISTS`).

## Taviz AI
`backend/ai.py` holds the system prompt and tools (`create_booking`, `get_my_bookings`, `create_support_ticket`). It replies in the client's language,
streams word by word, remembers the session, and can place bookings or confirmed support tickets for logged-in clients.
Clients can also submit a support ticket directly inside chat, including when using the local model. New unread complaints appear
in the admin command-centre ticket inbox, where the team can read, reply, and update status and priority in the same view.
Voice input uses the browser speech API (Chrome/Edge) in the selected language.

## Production notes
Serve the built frontend (`npm run build`) behind nginx/Caddy that proxies `/api` and `/ws` to the backend, use HTTPS,
set a strong `SECRET_KEY`, and set `CORS_ORIGINS` to your domain.
