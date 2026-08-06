import math
import re

from openai import OpenAI
import anthropic
import google.generativeai as genai

from app.config import settings
from app.models.report import VisibilityReport


def _build_prompt(brand_name: str, query: str) -> str:
    return (
        f"Please answer the following question comprehensively. "
        f"If you know about the brand or company '{brand_name}', mention it in your answer.\n\n"
        f"Question: {query}"
    )


def _calculate_score(mentioned: bool, position: int | None, word_count: int) -> float:
    if not mentioned:
        return 0.0
    pos_score = math.exp(-((position or 10) - 1) / 5) * 100
    wc_score = min(word_count / 5, 100.0)
    return round(0.6 * pos_score + 0.4 * wc_score, 2)


def _find_brand_position(text: str, brand_name: str) -> int | None:
    sentences = re.split(r'[.!?]\s+', text)
    for i, s in enumerate(sentences):
        if brand_name.lower() in s.lower():
            return i + 1
    return None


def _parse_response(text: str, brand_name: str) -> dict:
    mentioned = brand_name.lower() in text.lower()
    position = _find_brand_position(text, brand_name) if mentioned else None
    word_count = len(text.split())
    score = _calculate_score(mentioned, position, word_count)
    citation = None
    if mentioned:
        for sentence in re.split(r'[.!?]\s+', text):
            if brand_name.lower() in sentence.lower():
                citation = sentence.strip()
                break
    return {
        "mentioned": mentioned,
        "position": position,
        "word_count": word_count,
        "visibility_score": score,
        "citation_text": citation,
    }


def query_openai(brand_name: str, query: str) -> dict:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": _build_prompt(brand_name, query)},
        ],
        max_tokens=500,
    )
    text = response.choices[0].message.content or ""
    return _parse_response(text, brand_name)


def query_claude(brand_name: str, query: str) -> dict:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[
            {"role": "user", "content": _build_prompt(brand_name, query)},
        ],
    )
    text = message.content[0].text if message.content else ""
    return _parse_response(text, brand_name)


def query_gemini(brand_name: str, query: str) -> dict:
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(_build_prompt(brand_name, query))
    text = response.text or ""
    return _parse_response(text, brand_name)


def query_deepseek(brand_name: str, query: str) -> dict:
    client = OpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url="https://api.deepseek.com/v1")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": _build_prompt(brand_name, query)},
        ],
        max_tokens=500,
    )
    text = response.choices[0].message.content or ""
    return _parse_response(text, brand_name)


def query_qianwen(brand_name: str, query: str) -> dict:
    client = OpenAI(api_key=settings.QIANWEN_API_KEY, base_url="https://dashscope.aliyuncs.com/compatible-mode/v1")
    response = client.chat.completions.create(
        model="qwen-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": _build_prompt(brand_name, query)},
        ],
        max_tokens=500,
    )
    text = response.choices[0].message.content or ""
    return _parse_response(text, brand_name)


def query_mimo(brand_name: str, query: str) -> dict:
    client = OpenAI(api_key=settings.MIMO_API_KEY, base_url=settings.MIMO_BASE_URL)
    response = client.chat.completions.create(
        model=settings.MIMO_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": _build_prompt(brand_name, query)},
        ],
        max_tokens=500,
    )
    text = response.choices[0].message.content or ""
    return _parse_response(text, brand_name)


ENGINE_MAP = {
    "openai": query_openai,
    "claude": query_claude,
    "gemini": query_gemini,
    "deepseek": query_deepseek,
    "qianwen": query_qianwen,
    "mimo": query_mimo,
}


def check_visibility(brand_name: str, query: str, engine: str = "openai") -> dict:
    fn = ENGINE_MAP.get(engine)
    if not fn:
        raise ValueError(f"Unknown engine: {engine}. Supported: {list(ENGINE_MAP.keys())}")
    return fn(brand_name, query)


def generate_text(system_prompt: str, user_prompt: str, engine: str = "deepseek", timeout: float = 120.0) -> str:
    """Send a prompt to an LLM and return the raw text response."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    if engine == "deepseek":
        client = OpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url="https://api.deepseek.com/v1", timeout=timeout)
        response = client.chat.completions.create(model="deepseek-chat", messages=messages, max_tokens=8000)
        return response.choices[0].message.content or ""
    elif engine == "openai":
        client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=timeout)
        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages, max_tokens=8000)
        return response.choices[0].message.content or ""
    elif engine == "mimo":
        client = OpenAI(api_key=settings.MIMO_API_KEY, base_url=settings.MIMO_BASE_URL, timeout=timeout)
        response = client.chat.completions.create(model=settings.MIMO_MODEL, messages=messages, max_tokens=8000)
        return response.choices[0].message.content or ""
    elif engine == "qianwen":
        client = OpenAI(api_key=settings.QIANWEN_API_KEY, base_url="https://dashscope.aliyuncs.com/compatible-mode/v1", timeout=timeout)
        response = client.chat.completions.create(model="qwen-turbo", messages=messages, max_tokens=8000)
        return response.choices[0].message.content or ""
    elif engine == "claude":
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=timeout)
        message = client.messages.create(model="claude-sonnet-4-20250514", max_tokens=8000, messages=[{"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}])
        return message.content[0].text if message.content else ""
    elif engine == "gemini":
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel("gemini-pro")
        response = model.generate_content(f"{system_prompt}\n\n{user_prompt}")
        return response.text or ""
    else:
        raise ValueError(f"Unknown engine: {engine}. Supported: {list(ENGINE_MAP.keys())}")
