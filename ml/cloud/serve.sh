#!/usr/bin/env bash
# Run ON the rented GPU. Serves an OpenAI-compatible API on port 8000.
#   Phase A (no training yet): MODEL=Qwen/Qwen2.5-Coder-32B-Instruct TAVIX_LLM_KEY=secret ./serve.sh
#   Phase C (after training):  MODEL=./tavix-merged                    TAVIX_LLM_KEY=secret ./serve.sh
set -e
: "${TAVIX_LLM_KEY:?Set TAVIX_LLM_KEY to a long random secret}"
pip install -q vllm
vllm serve "${MODEL:-Qwen/Qwen2.5-Coder-32B-Instruct}" --served-model-name default_model --api-key "$TAVIX_LLM_KEY" \
  --host 0.0.0.0 --port 8000 --max-model-len 16384 --gpu-memory-utilization 0.92
