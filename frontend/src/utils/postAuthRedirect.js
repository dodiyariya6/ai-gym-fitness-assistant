// src/utils/postAuthRedirect.js
/*
==================================================
IFA — Intelligent Fitness Assistant

File: postAuthRedirect.js

Purpose:
Decides where to send a user immediately after a
successful login or registration — the single place
that distinguishes "new" from "existing" users.

Functionality:
- Reuses the existing has_profile signal (GET /profile/me
  already 404s until a Profile row is first saved) instead
  of introducing a new "is new user" flag.
- A one-shot decision made once at the moment of auth
  success — NOT a persistent route guard — so there is no
  redirect loop and a user who leaves /profile without
  saving is never trapped there on a later navigation.

Used By:
Login page
Register page

==================================================
*/
import { getProfile } from "../services/profileService";

// New users (no Profile row yet) land on /profile to complete onboarding.
// Existing users (profile already saved at least once) go straight to
// /dashboard. On any failure to check, default to /dashboard rather than
// blocking the user's login.
export async function resolvePostAuthDestination() {
  try {
    const profile = await getProfile();
    return profile ? "/dashboard" : "/profile";
  } catch {
    return "/dashboard";
  }
}
