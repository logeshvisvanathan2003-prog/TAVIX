#!/usr/bin/env bash
# Step 5: convert YOUR Hugging Face model to a 4-bit MLX model, then serve it.
# Usage: ./serve_mine.sh YOUR-HF-USERNAME/tavix-7b     (private repo: run `huggingface-cli login` first)
set -e
source ~/tavix-ml/bin/activate
[ -d tavix-mlx ] || python -m mlx_lm convert --hf-path "$1" -q --mlx-path tavix-mlx
python -m mlx_lm server --model ./tavix-mlx --port 8080
