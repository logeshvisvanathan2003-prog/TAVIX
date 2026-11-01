#!/usr/bin/env bash
# Step 1: serve the ready-made 7B model (no training) on http://localhost:8080
source ~/tavix-ml/bin/activate
python -m mlx_lm server --model mlx-community/Qwen2.5-Coder-7B-Instruct-4bit --port 8080
