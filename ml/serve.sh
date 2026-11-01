#!/usr/bin/env bash
# Serves your TAVIX model as an OpenAI-compatible API on :8080
python3 -m mlx_lm server --model ./tavix-model --port 8080
