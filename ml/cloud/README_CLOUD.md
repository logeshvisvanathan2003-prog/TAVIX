# Tavix AI on a rented GPU (train + serve)

## Phase A: serve a base model and connect the website (do this first, no training needed)
1. Create an account at RunPod (or Lambda / Vast.ai). Add a small amount of credit.
2. Deploy a GPU pod: 1x A100 80GB or H100 80GB, a PyTorch template, 150 GB disk, and expose HTTP port 8000.
3. Open the pod terminal and upload `serve.sh` (or paste it). Choose a long random secret, then:
   `MODEL=Qwen/Qwen2.5-Coder-32B-Instruct TAVIX_LLM_KEY=<secret> ./serve.sh`
   The first start downloads about 65 GB and takes several minutes. Wait for "Application startup complete".
4. Copy the pod's public address for port 8000 (RunPod shows a proxy link like https://<pod-id>-8000.proxy.runpod.net).
5. On your Mac, in `.env`:
   ```
   TAVIX_LLM_BACKEND=local
   LOCAL_LLM_URL=https://<pod-id>-8000.proxy.runpod.net/v1/chat/completions
   LOCAL_LLM_KEY=<secret>
   ```
   Restart the backend and place a test booking. Open My missions > Build Studio to see the model build.
6. **Stop or delete the pod when you are done** (billing continues otherwise).

## Phase B: collect training data (the real work)
Use the website with Claude as the brain (`TAVIX_LLM_BACKEND=anthropic`), fix each build in the admin panel, tick "reviewed".
Do not train on Claude's raw outputs (Anthropic's terms). Aim for 200+ reviewed builds. Then `cd ml && python export_dataset.py`.

## Phase C: train, then serve your own model
1. Start a pod as in Phase A, but do not run serve.sh yet.
2. Upload `ml/cloud/train_qlora.py` and the `ml/data/` folder (train.jsonl, valid.jsonl) to the pod. Remove personal details from the data first.
3. `pip install -U transformers peft trl bitsandbytes datasets accelerate && python train_qlora.py` (a few hours; watch eval loss).
4. `MODEL=./tavix-merged TAVIX_LLM_KEY=<secret> ./serve.sh`. Your website now uses your own model.
5. Test it against Claude on 20 real requests before switching clients over. Keep the pod's disk (or upload `tavix-merged` to a private Hugging Face repo) so you don't retrain.

## Honest limits
- These scripts were written but not run on a GPU by me. Expect small version fixes.
- A tunnel/proxy URL is public: always keep the API key on. For production, put the server behind your own domain with HTTPS.
- Cost: a GPU left running 24/7 costs far more than short runs. Start it for work, stop it after.
