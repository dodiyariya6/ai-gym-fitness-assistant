# tests/test_ai_reliability.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_ai_reliability.py

Purpose:
Verifies that every AI-dependent endpoint degrades
gracefully — never 500s, never raises — when Gemini is
unavailable. GEMINI_AVAILABLE is forced False for every
test by the `no_real_gemini` autouse fixture in
conftest.py, so this is the default state, not a special
case.

Tests:
5. Gemini unavailable → deterministic fallback works for
   both /analytics/insights and the fitness chatbot.

==================================================
"""


def test_gemini_unavailable_yields_deterministic_fallback(client, make_user, auth_headers):
    user = make_user()
    headers = auth_headers(user)

    # Insights endpoint: falls back to deterministic-only insights, still 200.
    insights_response = client.get("/analytics/insights", headers=headers)
    assert insights_response.status_code == 200
    body = insights_response.json()
    assert body["source"] == "fallback"
    assert len(body["insights"]) > 0

    # Chat endpoint: falls back to a fixed, safe message instead of raising.
    chat_response = client.post(
        "/fitness/chat", json={"message": "How is my form trending?"}, headers=headers
    )
    assert chat_response.status_code == 200
    chat_body = chat_response.json()
    assert chat_body["reply"] == "AI service is temporarily unavailable. Please try again later."
    assert isinstance(chat_body["session_id"], int)
