"""
Playground service — streams LLM responses token-by-token via SSE.

Supports OpenAI, Anthropic, and Ollama based on the node's definitionId.
"""
from __future__ import annotations

import json
import os
from typing import AsyncGenerator


async def stream_response(
    definition_id: str,
    config: dict,
    prompt: str,
    system_prompt: str,
) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted lines: 'data: <token>\n\n', ending with 'data: [DONE]\n\n'."""

    try:
        if definition_id.endswith(".openai") or definition_id.endswith(".vllm"):
            async for token in _stream_openai(config, prompt, system_prompt):
                yield f"data: {json.dumps({'token': token})}\n\n"

        elif definition_id.endswith(".anthropic"):
            async for token in _stream_anthropic(config, prompt, system_prompt):
                yield f"data: {json.dumps({'token': token})}\n\n"

        elif definition_id.endswith(".ollama"):
            async for token in _stream_ollama(config, prompt, system_prompt):
                yield f"data: {json.dumps({'token': token})}\n\n"

        elif "chain.rag" in definition_id or "chain.react" in definition_id:
            # For chain nodes fall back to a simple OpenAI call using the prompt template
            async for token in _stream_openai(config, prompt, system_prompt):
                yield f"data: {json.dumps({'token': token})}\n\n"

        else:
            yield f"data: {json.dumps({'error': f'No playground support for {definition_id}'})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

async def _stream_openai(config: dict, prompt: str, system_prompt: str):
    try:
        from openai import AsyncOpenAI
    except ImportError:
        yield "[openai package not installed — run: pip install openai]"
        return

    api_key = os.environ.get(config.get("api_key_env", "OPENAI_API_KEY"), "")
    base_url = config.get("base_url") or None  # for vLLM compat
    client = AsyncOpenAI(api_key=api_key or "sk-placeholder", base_url=base_url)

    messages = []
    sys = system_prompt or config.get("system_prompt", "")
    if sys:
        messages.append({"role": "system", "content": sys})
    messages.append({"role": "user", "content": prompt})

    stream = await client.chat.completions.create(
        model=config.get("model", "gpt-4o-mini"),
        messages=messages,
        temperature=float(config.get("temperature", 0.7)),
        max_tokens=int(config.get("max_tokens", 1000)),
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta


async def _stream_anthropic(config: dict, prompt: str, system_prompt: str):
    try:
        import anthropic
    except ImportError:
        yield "[anthropic package not installed — run: pip install anthropic]"
        return

    api_key = os.environ.get(config.get("api_key_env", "ANTHROPIC_API_KEY"), "")
    client = anthropic.AsyncAnthropic(api_key=api_key or "placeholder")

    sys = system_prompt or config.get("system_prompt", "")
    kwargs = dict(
        model=config.get("model", "claude-sonnet-4-6"),
        max_tokens=int(config.get("max_tokens", 1000)),
        messages=[{"role": "user", "content": prompt}],
    )
    if sys:
        kwargs["system"] = sys

    async with client.messages.stream(**kwargs) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_ollama(config: dict, prompt: str, system_prompt: str):
    try:
        import httpx
    except ImportError:
        yield "[httpx package not installed — run: pip install httpx]"
        return

    base_url = config.get("base_url", "http://localhost:11434")
    model = config.get("model", "llama3.2")
    sys = system_prompt or config.get("system_prompt", "")

    messages = []
    if sys:
        messages.append({"role": "system", "content": sys})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{base_url}/api/chat",
            json={"model": model, "messages": messages, "stream": True},
        ) as resp:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield token
                except json.JSONDecodeError:
                    continue
