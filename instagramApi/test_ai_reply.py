from ai_reply import build_messages, build_system_prompt


def test_prompt_uses_owner_store_settings(monkeypatch):
    monkeypatch.setenv("STORE_NAME", "Kopi Senja")
    monkeypatch.setenv("STORE_HOURS", "Setiap hari 08.00-22.00")
    monkeypatch.setenv("STORE_ADDRESS", "Jl. Mawar 10")
    monkeypatch.setenv("STORE_PRODUCTS", "Kopi susu dan pastry")
    monkeypatch.setenv("AI_TONE", "hangat dan profesional")
    monkeypatch.setenv("AI_LANGUAGE", "Bahasa Indonesia")
    monkeypatch.setenv("AI_EXTRA_RULES", "Jangan menjanjikan stok")

    prompt = build_system_prompt()

    assert "Kopi Senja" in prompt
    assert "Setiap hari 08.00-22.00" in prompt
    assert "Jangan menjanjikan stok" in prompt


def test_build_messages_keeps_custom_prompt_as_system_message(monkeypatch):
    monkeypatch.setenv("STORE_HOURS", "09.00-17.00")

    messages = build_messages([], "Buka jam berapa?")

    assert messages[0]["role"] == "system"
    assert "09.00-17.00" in messages[0]["content"]
    assert messages[-1] == {"role": "user", "content": "Buka jam berapa?"}
