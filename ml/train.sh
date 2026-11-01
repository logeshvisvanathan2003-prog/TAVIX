#!/usr/bin/env bash
# LoRA fine-tune on your Mac with MLX. Usage: ./train.sh mlx-community/Qwen2.5-Coder-7B-Instruct-4bit
set -e
MODEL=${1:-mlx-community/Qwen2.5-Coder-7B-Instruct-4bit}
python3 -m mlx_lm lora --model "$MODEL" --train --data data --adapter-path adapters \
  --batch-size 1 --num-layers 8 --iters 600 --learning-rate 1e-5 --max-seq-length 4096 --grad-checkpoint
python3 -m mlx_lm fuse --model "$MODEL" --adapter-path adapters --save-path tavix-model
echo "Done. Serve it with ./serve.sh"
