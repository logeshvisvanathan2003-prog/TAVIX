#!/usr/bin/env bash
# One-time setup on your Mac for the free local model.
set -e
python3 -m venv ~/tavix-ml && source ~/tavix-ml/bin/activate
pip install -U mlx-lm
echo "Setup done. Next: ./serve_base.sh"
