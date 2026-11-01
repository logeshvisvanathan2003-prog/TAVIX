"""Loads .env by itself, so it no longer matters how the server was started.

Looks for .env in the project root (next to docker-compose.yml) and in backend/.
Values in .env win over stale variables left in your terminal.
Import this FIRST (main.py does) so every other module sees the settings.
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv missing: tell the user clearly instead of silently ignoring .env
    load_dotenv = None

HERE = Path(__file__).resolve().parent
LOADED = []
if load_dotenv:
    for p in (HERE.parent / ".env", HERE / ".env"):
        if p.exists():
            load_dotenv(p, override=True)
            LOADED.append(str(p))

HF_URL = "https://router.huggingface.co/v1/chat/completions"
HF_DEFAULT_MODEL = "Qwen/Qwen3-Coder-480B-A35B-Instruct"


def backend() -> str:
    """'local' (any OpenAI-compatible server: MLX, Hugging Face router, vLLM) or 'anthropic'."""
    b = os.getenv("TAVIX_LLM_BACKEND", "").strip().lower()
    if b in ("local", "anthropic"):
        return b
    # not set explicitly: a Hugging Face / local key or URL means the user wants the open-model path
    if os.getenv("LOCAL_LLM_KEY") or os.getenv("LOCAL_LLM_URL"):
        return "local"
    return "anthropic"


def local_url() -> str:
    return os.getenv("LOCAL_LLM_URL", "").strip() or "http://localhost:8080/v1/chat/completions"


def local_model() -> str:
    m = os.getenv("LOCAL_LLM_MODEL", "").strip()
    if m:
        return m
    return HF_DEFAULT_MODEL if "huggingface.co" in local_url() else "default_model"


def local_headers() -> dict:
    k = os.getenv("LOCAL_LLM_KEY", "").strip()
    return {"Authorization": "Bearer " + k} if k else {}


def describe() -> str:
    """One readable line for the startup log."""
    if backend() == "local":
        key = "key set" if os.getenv("LOCAL_LLM_KEY", "").strip() else "NO KEY"
        return f"AI brain: local/open model -> {local_model()} @ {local_url()} ({key})"
    key = "key set" if os.getenv("ANTHROPIC_API_KEY") else "NO ANTHROPIC_API_KEY"
    return f"AI brain: Claude API ({key})"


def chat_model() -> str:
    """Model for the chat widget. On Groq's free tier each model has its own per-minute limit,
    so giving chat a different model than the builder keeps chats from starving builds."""
    return os.getenv("LOCAL_CHAT_MODEL", "").strip() or local_model()
