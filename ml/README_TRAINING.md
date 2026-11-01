# Train and host your own Tavix AI

**Be realistic first.** Nobody trains a powerful LLM from scratch on a Mac: that takes thousands of GPUs. What works,
and is what the big labs' open models are built for, is **fine-tuning** (LoRA) a strong open-weight model on your own examples
with Apple's MLX, then serving it locally. It learns TAVIX's style and format. It does not become smarter than its base model
or create a Claude-equivalent model. The same open-model endpoint can power the Tavix AI chat and website builder.

## Pick the base model by your Mac's memory
| Unified memory | Base model (mlx-community, 4-bit) | Notes |
|---|---|---|
| 16 GB | `Qwen2.5-Coder-7B-Instruct-4bit` | Fine for requirement specs and small sites. Fine-tunes in about 8 GB. |
| 32 to 48 GB | `Qwen3-Coder-30B-A3B-Instruct-4bit` | Mixture-of-experts: about 3B active parameters, so it is fast. Strong at code. |
| 64 GB and up | `Qwen3-32B-4bit` or the 30B coder at 6-bit | Best quality that still fits one Mac. |

I could not verify exact repo names on your machine: search them on huggingface.co/mlx-community and use the latest Qwen
Coder build you find there. Qwen models are Apache 2.0, which allows commercial use; check the license on the exact one you pick.
Tell me your chip and RAM and I will tighten this.

## Steps
1. `pip install mlx-lm psycopg2-binary`
2. Collect data. In the admin panel, open each booking, fix the AI build until it is good, tick "AI build reviewed". Aim for 200+ reviewed builds (1000+ is better).
3. `cd ml && python export_dataset.py` (reads your PostgreSQL, writes `ml/data/train.jsonl` and `valid.jsonl`).
4. `./train.sh mlx-community/<your-chosen-model>` (hours, not days, for 7B to 30B).
5. `./serve.sh`, then in `.env` set:
   ```
   TAVIX_LLM_BACKEND=local
   LOCAL_LLM_URL=http://host.docker.internal:8080/v1/chat/completions
   ```
   (use `localhost` instead of `host.docker.internal` if the backend is not in Docker). Restart the backend.

## Fine-tune the chat assistant

The existing `ml/export_dataset.py` exports reviewed **build** examples, not conversations. For chat fine-tuning, prepare
separate MLX chat-format JSONL files under `ml/chat/data/` with one JSON object per line, for example:

```json
{"messages":[{"role":"system","content":"You are Tavix AI. Answer clearly and do not invent prices."},{"role":"user","content":"What does Tavix build?"},{"role":"assistant","content":"TAVIX builds software, AI/ML, embedded, and blockchain solutions. Share the problem you want to solve and the team can suggest a direction."}]}
```

Create `train.jsonl` and `valid.jsonl` with a held-out validation set. Use only examples written or licensed for this purpose;
remove personal data, credentials, and confidential client details. Do not copy Claude or other provider outputs into the dataset.
Start with a few hundred high-quality, varied examples, then review the model's answers against the held-out set.

From `ml/`, train and fuse a separate adapter/model (adjust the base model and layer count for your available memory):

```bash
mkdir -p chat/data
python3 -m mlx_lm lora --model mlx-community/Qwen2.5-Coder-7B-Instruct-4bit --train \
  --data chat/data --adapter-path chat/adapters --batch-size 1 --num-layers 8 \
  --iters 600 --learning-rate 1e-5 --max-seq-length 4096 --grad-checkpoint
python3 -m mlx_lm fuse --model mlx-community/Qwen2.5-Coder-7B-Instruct-4bit \
  --adapter-path chat/adapters --save-path chat/tavix-chat-model
```

Run the chat model with `python3 -m mlx_lm server --model ./chat/tavix-chat-model --port 8080`. Point `LOCAL_CHAT_MODEL`
to the served model name if your OpenAI-compatible provider requires it. The current local chat integration is text-only:
it cannot execute Claude tool calls such as creating bookings. Clients can still submit bookings with the website form.

## Host the site on `tavixai.in`

1. Deploy the production server on a Linux host with a supported GPU for the model, or use a managed OpenAI-compatible model
   endpoint. A Mac development machine is not a reliable public production host.
2. Point the domain's DNS `A`/`AAAA` records (and `www`, if used) to that server. Open only ports 80 and 443 publicly.
   Keep the model server on a private interface; do not expose port 8080 to the internet.
3. Build the frontend with `cd frontend && npm ci && npm run build`. Run the FastAPI service on `127.0.0.1:8000`,
   configure a production database, set a unique `SECRET_KEY`, and set:

   ```dotenv
   CORS_ORIGINS=https://tavixai.in,https://www.tavixai.in
   TAVIX_LLM_BACKEND=local
   LOCAL_LLM_URL=http://127.0.0.1:8080/v1/chat/completions
   LOCAL_LLM_KEY=
   LOCAL_CHAT_MODEL=your-served-model-name
   ```

   If the backend runs in Docker and the model server is on the host, use
   `LOCAL_LLM_URL=http://host.docker.internal:8080/v1/chat/completions` where supported, or put both services on a private
   container network. Never commit `.env` or use development credentials in production.
4. Configure Caddy (or nginx) to serve `frontend/dist`, route `/api/*` and `/ws/*` to FastAPI, and enable HTTPS. Caddy's
   automatic certificate management can issue TLS certificates once DNS points to the host. Verify login, chat streaming,
   project ZIP downloads, and the AI health indicator over HTTPS before announcing the site.
5. Monitor model latency, memory, failed builds, and API logs. Keep database backups and a rollback copy of the previous model.

Example Caddy site block (adjust the absolute frontend path and service addresses):

```caddy
tavixai.in, www.tavixai.in {
    encode zstd gzip
    @backend path /api/* /ws/*
    reverse_proxy @backend 127.0.0.1:8000
    root * /absolute/path/to/tavix/frontend/dist
    try_files {path} /index.html
    file_server
}
```

## Rules that matter
- **Do not train on Claude's outputs.** Anthropic's terms do not allow using them to build competing models. The export script skips builds made by the Claude API. Seed your data with your team's own work, or with your local model's output that your engineers corrected.
- Until you have enough reviewed data, a fine-tuned small model will build weaker sites than Claude. Run both: keep `TAVIX_LLM_BACKEND=anthropic`, compare outputs side by side on 20 real requests, and switch only when the local model passes your review.
- In local mode Tavix AI chat cannot place bookings by itself (tool calls are Claude-only); clients use the Booking form.
- Keep validation examples out of training and read the model's outputs yourself before trusting a metric.
