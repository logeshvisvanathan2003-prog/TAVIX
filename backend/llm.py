"""One interface for both brains: an open model through any OpenAI-compatible server
(Hugging Face router, Groq, MLX on your Mac, vLLM on a rented GPU) or the Claude API.

Everything streams, so the website can show the AI writing live. Rate limits (HTTP 429) on
free tiers are waited out automatically instead of failing the build."""
import asyncio, json, os, re
import httpx
import config

HINTS = {401: "Token rejected. Check LOCAL_LLM_KEY in .env.", 402: "Free credit is used up.", 403: "Token lacks permission.",
         404: "Model name not found. Check LOCAL_LLM_MODEL.", 413: "Request too big for this free tier. Lower BUILD_SITE_TOKENS in .env (try 3000).",
         429: "Rate limited (free tier). Wait a minute and retry."}


def clean(t: str) -> str:
    """Remove <think>...</think> reasoning blocks some open models print before the answer."""
    return re.sub(r"<think>.*?</think>", "", t or "", flags=re.S).strip()


def visible(t: str) -> str:
    """Same as clean() but also hides a <think> block that is still being written."""
    t = re.sub(r"<think>.*?</think>", "", t or "", flags=re.S)
    i = t.find("<think>")
    return (t[:i] if i >= 0 else t).lstrip()


def _error(status: int, text: str) -> RuntimeError:
    return RuntimeError(f"Model server answered HTTP {status}. {HINTS.get(status, '')} {text[:160]}".strip())


def _body(model, messages, max_tokens, temperature, stream):
    url = config.local_url()
    body = {"model": model, "max_tokens": max_tokens, "temperature": temperature, "messages": messages, "stream": stream}
    if "gpt-oss" in model and ("groq.com" in url or "cerebras.ai" in url):
        body["reasoning_effort"] = "low"  # keeps hidden reasoning from eating the output budget
    return body


async def stream_local(messages, max_tokens=6000, model=None, temperature=0.3, on_text=None, on_status=None, tries=5):
    """Stream from an OpenAI-compatible server. on_text(full_visible_text) after each chunk.
    on_status(str) for 'thinking' and 'rate limited, retrying' messages. Returns the final cleaned text."""
    url, model = config.local_url(), model or config.local_model()
    body = _body(model, messages, max_tokens, temperature, True)
    async with httpx.AsyncClient(timeout=httpx.Timeout(1800, connect=20)) as c:
        for attempt in range(tries):
            wait = 0
            async with c.stream("POST", url, headers=config.local_headers(), json=body) as r:
                if r.status_code == 429 and attempt < tries - 1:
                    await r.aread()
                    wait = min(float(r.headers.get("retry-after", 15) or 15), 65) + 1
                elif r.status_code != 200:
                    raise _error(r.status_code, (await r.aread()).decode("utf-8", "ignore"))
                else:
                    full, thinking = "", False
                    async for line in r.aiter_lines():
                        if not line.startswith("data:") or line.strip().endswith("[DONE]"): continue
                        try: ch = json.loads(line[5:])["choices"][0].get("delta", {})
                        except Exception: continue
                        if (ch.get("reasoning") or ch.get("reasoning_content")) and not full and not thinking:
                            thinking = True
                            if on_status: await _maybe(on_status("Thinking it through…"))
                        t = ch.get("content") or ""
                        if t:
                            full += t
                            if on_text: await _maybe(on_text(visible(full)))
                    return clean(full)
            if on_status: await _maybe(on_status(f"The free AI tier is busy. Waiting {int(wait)}s, then continuing automatically…"))
            await asyncio.sleep(wait)
    raise _error(429, "Still rate limited after several waits.")


async def _maybe(x):
    if asyncio.iscoroutine(x): await x


async def complete(system: str, user: str, max_tokens: int = 6000, on_text=None, on_status=None):
    """Returns (text, provider). With on_text it streams so callers can show progress live."""
    if config.backend() == "local":
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        return await stream_local(msgs, max_tokens, on_text=on_text, on_status=on_status), "local"

    if not os.getenv("ANTHROPIC_API_KEY"):
        raise RuntimeError("No AI brain configured. In .env set TAVIX_LLM_BACKEND=local with LOCAL_LLM_URL, LOCAL_LLM_KEY and LOCAL_LLM_MODEL "
                           "(free Groq or Hugging Face), or set ANTHROPIC_API_KEY.")
    from anthropic import AsyncAnthropic
    cl = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    full = ""
    async with cl.messages.stream(model=os.getenv("TAVIX_BUILD_MODEL", "claude-sonnet-4-6"), max_tokens=min(max_tokens, 8000),
                                  system=system, messages=[{"role": "user", "content": user}]) as s:
        async for t in s.text_stream:
            full += t
            if on_text: await _maybe(on_text(full))
    return full, "anthropic"
