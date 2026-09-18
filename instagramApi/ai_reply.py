"""AI reply generation via Groq (OpenAI-compatible chat completions).

Design notes:
- `generate` is a pure-ish function: given an incoming message and history,
  it returns a ReplyResult. HTTP is isolated in `_call_groq` so tests mock it.
- No fine-tuning. Behaviour comes from a strict system prompt + few-shot
  examples + low temperature. Guardrails live in guardrails.py / store.py.
- Handoff: certain keywords skip the AI entirely and ask for a human.
"""
import os
from dataclasses import dataclass
from typing import Iterable, Optional

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-20b"
DEFAULT_TEMPERATURE = 0.3
DEFAULT_MAX_TOKENS = 400
DEFAULT_TIMEOUT = 30.0

# Keep the prompt small: fewer tokens = faster + cheaper + less drift.
MAX_HISTORY_MESSAGES = 12
MAX_REPLY_CHARS = 1000

HANDOFF_REPLY = (
    "Baik kak, pertanyaan ini akan langsung saya teruskan ke admin kami ya. "
    "Mohon ditunggu sebentar."
)

DEFAULT_HANDOFF_KEYWORDS = [
    "komplain",
    "refund",
    "penipuan",
    "lapor",
    "manusia",
    "admin asli",
]

DEFAULT_SYSTEM_PROMPT = """Kamu adalah admin Instagram sebuah toko. Tugasmu HANYA membalas DM
seputar produk dan layanan toko: harga, stok, ukuran, cara pesan, pembayaran,
pengiriman, garansi, dan jam operasional.

Aturan:
- Balas dalam Bahasa Indonesia yang ramah, singkat (maksimal 3 kalimat), dan pakai "kak".
- JANGAN pernah mengaku sebagai AI, chatbot, atau bahasa pemrograman.
- JANGAN membahas topik di luar toko: politik, agama, berita, tugas sekolah,
  coding, nasihat medis/hukum, atau curhat pribadi.
- Kalau pertanyaan di luar topik, tolak dengan sopan dan arahkan kembali ke topik toko.
- Kalau kamu tidak tahu jawabannya (misal stok pasti atau keluhan khusus),
  katakan akan diteruskan ke admin manusia. Jangan mengarang harga, stok, atau janji.
- Jangan pernah meminta data sensitif: password, OTP, nomor kartu, atau PIN.

Contoh:
User: halo
Assistant: Halo kak, selamat datang! Ada yang bisa dibantu soal produk kami?

User: kamu bot ya?
Assistant: Saya admin toko kak, siap bantu pesanan kamu.
"""


@dataclass(frozen=True)
class ReplyResult:
    reply: str
    handoff: bool = False
    error: Optional[str] = None


def _handoff_keywords() -> list:
    raw = os.environ.get("HANDOFF_KEYWORDS", "")
    if raw.strip():
        return [p.strip().lower() for p in raw.split(",") if p.strip()]
    return list(DEFAULT_HANDOFF_KEYWORDS)


def needs_handoff(text: str, keywords: Optional[Iterable[str]] = None) -> bool:
    """True if the message contains a keyword requiring a human."""
    if keywords is None:
        keywords = _handoff_keywords()
    haystack = (text or "").lower()
    return any(k.strip().lower() in haystack for k in keywords if k.strip())


def build_system_prompt() -> str:
    """Build the system prompt from owner-editable environment settings."""
    settings = [
        ("Nama toko", os.environ.get("STORE_NAME", "toko kami")),
        ("Jam operasional", os.environ.get("STORE_HOURS", "belum diatur")),
        ("Alamat toko", os.environ.get("STORE_ADDRESS", "belum diatur")),
        ("Produk atau layanan", os.environ.get("STORE_PRODUCTS", "belum diatur")),
        ("Gaya balasan", os.environ.get(
            "AI_TONE",
            "ramah, singkat, natural, dan menggunakan panggilan kak",
        )),
        ("Bahasa balasan", os.environ.get("AI_LANGUAGE", "Bahasa Indonesia")),
    ]
    context = "\n".join(f"- {label}: {value}" for label, value in settings)
    extra_rules = os.environ.get("AI_EXTRA_RULES", "").strip()
    custom_rules = (
        "\nAturan tambahan dari owner:\n" + extra_rules
        if extra_rules
        else ""
    )
    return (
        DEFAULT_SYSTEM_PROMPT
        + "\nInformasi bisnis yang wajib kamu gunakan jika relevan:\n"
        + context
        + custom_rules
        + "\nJangan mengarang informasi bisnis yang tidak tercantum di atas."
    )


def build_messages(history: Iterable[dict], incoming: str) -> list:
    """Build the OpenAI-style message list: system + capped history + incoming.

    History items look like {"role": "user"|"assistant", "text": "..."}.
    """
    messages = [{"role": "system", "content": build_system_prompt()}]
    cleaned = []
    for item in history or []:
        role = str(item.get("role", "")).lower()
        text = str(item.get("text", "") or "").strip()
        if role in ("user", "assistant") and text:
            cleaned.append({"role": role, "content": text})
    messages.extend(cleaned[-MAX_HISTORY_MESSAGES:])
    messages.append({"role": "user", "content": (incoming or "").strip()})
    return messages


def _call_groq(
    model: str,
    api_key: str,
    messages: list,
    temperature: float,
    max_tokens: int,
    timeout: float,
) -> str:
    """Single HTTP call to Groq. Isolated so tests can monkeypatch it."""
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            GROQ_URL,
            headers={
                "Authorization": "Bearer " + api_key,
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    return data["choices"][0]["message"]["content"] or ""


def generate(
    incoming: str,
    history: Iterable[dict],
    *,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    timeout: Optional[float] = None,
    handoff_keywords: Optional[Iterable[str]] = None,
) -> ReplyResult:
    """Produce a reply for one incoming DM.

    Returns ReplyResult. On handoff the AI is not called at all.
    Raises RuntimeError if no API key is configured and the AI is needed.
    """
    text = (incoming or "").strip()
    if not text:
        return ReplyResult(reply="", handoff=False, error="empty_message")

    if needs_handoff(text, handoff_keywords):
        return ReplyResult(reply=HANDOFF_REPLY, handoff=True)

    key = api_key or os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to the ignored instagramApi/.env file."
        )

    raw = _call_groq(
        model=model or os.environ.get("GROQ_MODEL", DEFAULT_MODEL),
        api_key=key,
        messages=build_messages(history, text),
        temperature=(
            temperature
            if temperature is not None
            else float(os.environ.get("AI_TEMPERATURE", DEFAULT_TEMPERATURE))
        ),
        max_tokens=(
            max_tokens
            if max_tokens is not None
            else int(os.environ.get("AI_MAX_TOKENS", DEFAULT_MAX_TOKENS))
        ),
        timeout=timeout if timeout is not None else DEFAULT_TIMEOUT,
    )

    reply = (raw or "").strip()
    if not reply:
        return ReplyResult(reply="", handoff=False, error="empty_reply")
    return ReplyResult(reply=reply[:MAX_REPLY_CHARS], handoff=False)
