# tests/test_auth_onboarding.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: test_auth_onboarding.py

Purpose:
Covers the auth/onboarding flow added in the Final
Product Enhancement: registration returns a working
access token (no redundant second manual login), and
GET /profile/me's existing 404-until-saved contract is
locked down since the frontend's post-auth redirect now
silently depends on it.

Tests:
- Registration issues a token that authenticates like a
  login token would.
- New user has no profile (404) until one is saved (200).

==================================================
"""

from jose import jwt

from app.services.auth_service import SECRET_KEY, ALGORITHM


def test_register_returns_access_token(client):
    response = client.post(
        "/auth/register",
        json={"username": "newbie", "email": "newbie@example.com", "password": "Password123!"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    # The returned token must actually authenticate — proves it's not just a
    # placeholder string, and confirms it works the same as a login token.
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    profile_response = client.get("/profile/me", headers=headers)
    # 404 (no profile saved yet), not 401 — proves the token itself is valid.
    assert profile_response.status_code == 404


def test_register_token_sub_matches_registered_email(client):
    response = client.post(
        "/auth/register",
        json={"username": "subcheck", "email": "subcheck@example.com", "password": "Password123!"},
    )
    token = response.json()["access_token"]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "subcheck@example.com"


def test_new_user_has_no_profile_until_saved(client, make_user, auth_headers):
    user = make_user()
    headers = auth_headers(user)

    # New user — has_profile is false, signalled by 404 (the frontend's
    # resolvePostAuthDestination() relies on exactly this).
    before = client.get("/profile/me", headers=headers)
    assert before.status_code == 404

    save = client.post(
        "/profile/",
        json={"name": "Test User", "age": 25, "gender": "male", "height": 175, "weight": 70},
        headers=headers,
    )
    assert save.status_code == 200

    after = client.get("/profile/me", headers=headers)
    assert after.status_code == 200
