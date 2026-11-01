# Free path: your own Tavix AI model, step by step (cost: $0)

Everything here uses your 16 GB MacBook Air plus free Kaggle GPU time. Read "Limits" at the bottom first.

## Part 1: Run the website with a free local model (about 30 minutes)
1. Install tools (once): Docker Desktop, Node.js 20+, Python 3.11+.
2. Set up the model runner: `cd ml/free && ./mac_setup.sh`
3. Start the model (leave this Terminal window open): `./serve_base.sh`
   The first run downloads about 4.5 GB. Wait until it says it is serving on port 8080.
4. In the project folder: `cp .env.example .env`, then edit `.env`:
   ```
   SECRET_KEY=<any long random text>
   ADMIN_PASSWORD=<your admin password>
   TAVIX_LLM_BACKEND=local
   LOCAL_LLM_URL=http://localhost:8080/v1/chat/completions
   ```
   (No Anthropic key is needed in local mode.)
5. Start the database (new Terminal): `docker compose up db -d`
6. Start the backend (same Terminal):
   ```
   cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   set -a; source ../.env; set +a
   uvicorn main:app --reload
   ```
7. Start the website (new Terminal): `cd frontend && npm install && npm run dev`, then open http://localhost:5173
8. Register a client account, open Book, and place a test mission. Open My missions > Open Build Studio.
   A 7B model on your Mac needs roughly 5 to 15 minutes to finish a build. If it fails, click Rebuild in the admin panel.
   If the logs say the model was not found, set `LOCAL_LLM_MODEL` in `.env` to the exact name you passed to `--model`.

## Part 2: Collect training data (this is what makes the model yours)
9. Log in as admin (logesh@tavix.in, or the `ADMIN_EMAIL` you set) > bookings.
10. For each booking: open "Correct the AI build", fix the requirements JSON and the website HTML until they are what you would deliver, then Save. This marks it reviewed.
    Use realistic requests from real or sample clients across all your sectors. Do not paste Claude's outputs.
11. You need 200 or more corrected builds (1,000+ is better). 20 will not teach the model anything useful.
12. Export: `cd ml && pip install psycopg2-binary && python export_dataset.py`
    This creates `ml/data/train.jsonl` and `ml/data/valid.jsonl`. Open them and read a few lines. Remove any real client names, emails or phone numbers.

## Part 3: Train for free on Kaggle (about 1 hour)
13. Sign up at kaggle.com and verify your phone (needed for GPU and internet).
14. Hugging Face: create an account at huggingface.co, then Settings > Access Tokens > New token with **write** access. Copy it.
15. Kaggle: Datasets > New Dataset > upload `train.jsonl` and `valid.jsonl`, set it **Private**.
16. Kaggle: Code > New Notebook > File > Import Notebook > upload `ml/free/tavix_kaggle_train.ipynb`.
17. Notebook settings: Accelerator **GPU T4 x2**, Internet **On**. Add-ons > Secrets: add `HF_TOKEN` with your token. Add your dataset from the Input panel.
18. Edit cell 2: `DATA_DIR` (path shown in the Input panel), `HF_REPO` (e.g. `yourname/tavix-7b`). Click Run All.
19. When the last cell prints "Pushed", your merged model is in your private Hugging Face repo.

## Part 4: Run your trained model on the Mac
20. Stop `serve_base.sh` (Ctrl+C). Log in once: `pip install -U huggingface_hub && huggingface-cli login`
21. `cd ml/free && ./serve_mine.sh yourname/tavix-7b` (first run converts it to 4-bit; later runs start fast).
22. Keep `.env` as it is and restart the backend. The website now uses your own model.
23. Test with 20 real requests. If it builds worse than the base model, you need more or cleaner data. Switch back with `./serve_base.sh`.

## Limits (read these)
- Kaggle's free GPU is limited to about 30 hours a week with 9-hour sessions, and the 7B model is the largest that fits.
- A fine-tuned 7B model will be noticeably weaker than Claude or a 32B model, especially on long website code. It works best for requirement specs and chat. Check your results honestly before showing clients.
- The Kaggle notebook skips examples longer than 4096 tokens. If most of your website HTML is longer than that, the model will mainly learn the requirement specs.
- Your data goes to Kaggle and Hugging Face. Keep both private and remove personal details.
- I wrote these scripts but could not run them on a GPU or your Mac. Library versions change, so expect to fix an error or two by reading the message.
