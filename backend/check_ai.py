"""Run this FIRST when a build fails:   cd backend && python check_ai.py
It shows which brain the server will use and sends one tiny test message."""
import asyncio
import config, llm

print("Loaded .env files:", config.LOADED or "NONE FOUND (put .env next to docker-compose.yml)")
print(config.describe())


async def main():
    try:
        text, prov = await llm.complete("Reply with one word.", "Say hello.", 30)
        print(f"OK ({prov}): {text!r}")
    except Exception as e:
        print("FAILED:", e)

asyncio.run(main())
