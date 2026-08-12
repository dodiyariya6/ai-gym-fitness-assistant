# app/services/ai_insight_service.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: ai_insight_service.py

Purpose:
Layer 2 of the two-layer insight system. Takes the
deterministic findings already computed by
context_service, progressive_overload_service and
correlation_service (Layer 1) and asks Gemini to
INTERPRET them into short, grounded, structured
insights. Gemini never recalculates a number and never
invents history — every insight must trace back to a
deterministic fact.

Functionality:
- Assembles UserFitnessContext + wellness breakdown +
  progressive overload + habit/workout correlation
  findings into one compact prompt.
- Requests structured (schema-validated) output from
  Gemini via gemini_service.safe_invoke().
- Falls back to deterministic-only insights (built
  directly from the findings, no AI text) whenever
  Gemini is unavailable, times out, or returns
  malformed output — never raises, never 500s.
- Simple in-process hash+TTL cache so unchanged user
  context does not trigger a new Gemini call on every
  page load (P2.8 cost control) — no external cache
  infrastructure needed for this project's scale.

Responsibilities:
Insight orchestration
Structured AI interpretation
Reliability fallback
Regeneration cost control

Used By:
analytics.py router (/analytics/insights)
Dashboard, Reports pages

==================================================
"""

import hashlib
from datetime import datetime, timedelta, timezone

from app.services.analytics_service import get_user_analytics
from app.services.context_service import build_user_context
from app.services.progressive_overload_service import analyze_progressive_overload
from app.services.correlation_service import analyze_habit_workout_correlation
from app.services.gemini_service import safe_invoke, AIUnavailableError
from app.schemas.insight import AIInsight, AIInsightList, InsightsResponse

CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours — see module docstring.

# Keyed by user_id. Kept in-process and unbounded-but-tiny (one row per
# active user) — appropriate for this project's single-instance deployment.
# Deliberately not a database table or Redis: the simplest mechanism that
# satisfies "don't regenerate on every request" without new infrastructure.
_insight_cache: dict[int, dict] = {}


def _context_hash(wellness_breakdown, overload_findings, correlation_findings, context) -> str:
    """
    Deterministic fingerprint of everything that could change the AI's
    output. Unchanged hash + within TTL ⇒ skip the Gemini call entirely.
    """
    parts = (
        context.wellness.score,
        context.habits.avg_sleep_7d,
        context.habits.avg_water_7d,
        context.habits.avg_steps_7d,
        context.habits.logging_streak,
        context.habits.consistency_streak,
        context.workouts.total_workouts,
        context.workouts.avg_form_score,
        context.workouts.weekly_workouts,
        tuple(sorted(item["points"] for item in wellness_breakdown)),
        tuple(sorted((f["exercise"], f["rep_status"], f["volume_status"]) for f in overload_findings)),
        tuple(sorted((f.get("x"), f.get("y"), f.get("status")) for f in correlation_findings)),
    )
    return hashlib.md5(repr(parts).encode("utf-8")).hexdigest()


def _priority_from_wellness(score: int) -> str:
    if score < 50:
        return "high"
    if score < 75:
        return "medium"
    return "low"


def _fallback_insights(context, wellness_breakdown, overload_findings, correlation_findings) -> list[AIInsight]:
    """
    Deterministic-only insights — used whenever Gemini is unavailable/fails/
    returns malformed output. Every field here is built directly from a
    finding already computed by Layer 1; no AI text is generated.
    """
    insights: list[AIInsight] = []

    if wellness_breakdown and (context.has_workout_history or context.has_habit_history):
        weakest = min(
            wellness_breakdown,
            key=lambda c: (c["points"] / c["max_points"]) if c["max_points"] else 1,
        )
        insights.append(
            AIInsight(
                category="wellness",
                priority=_priority_from_wellness(context.wellness.score),
                title=f"Wellness score: {context.wellness.score}/100",
                evidence=(
                    f"{weakest['label']} contributed {weakest['points']}/"
                    f"{weakest['max_points']} points to your wellness score — "
                    "the lowest-scoring component this period."
                ),
                recommendation=(
                    f"Focus on {weakest['label'].lower()} first — it has the "
                    "most headroom to raise your overall score."
                ),
                action=f"Improve {weakest['label'].lower()}",
            )
        )

    for suggestion in context.weaknesses:
        insights.append(
            AIInsight(
                category="consistency",
                priority="medium",
                title="Area to improve",
                evidence=suggestion,
                recommendation=suggestion,
            )
        )

    for f in overload_findings[:3]:
        if f["rep_status"] == "insufficient_data":
            continue
        insights.append(
            AIInsight(
                category="progressive_overload",
                priority="low" if f["rep_status"] == "improving" else "medium",
                title=f"{f['exercise']}: {f['rep_status'].replace('_', ' ')}",
                evidence=f["evidence"],
                recommendation=(
                    "Keep up the current progression."
                    if f["rep_status"] == "improving"
                    else "Consider a small increase in reps, sets or load next session."
                ),
            )
        )

    for f in correlation_findings:
        if f.get("status") != "found":
            continue
        insights.append(
            AIInsight(
                category="habit_correlation",
                priority="low",
                title=f"{f['x']} and {f['y']}",
                evidence=f["evidence"],
                recommendation=(
                    f"Keeping {f['x'].lower()} consistent may support your "
                    f"{f['y'].lower()}."
                ),
            )
        )

    if not insights:
        insights.append(
            AIInsight(
                category="general",
                priority="low",
                title="Not enough data yet",
                evidence="No workouts or habits have been logged yet.",
                recommendation="Log a workout or a habit entry to start receiving personalized insights.",
            )
        )

    return insights[:6]


_INSIGHT_PROMPT_TEMPLATE = """You are FitAI's insight-interpretation layer. You are given ALREADY-COMPUTED,
deterministic facts about exactly one user. You must interpret them, not
recalculate or invent them.

Hard rules:
- Every insight's "evidence" field must directly reflect one of the facts
  below — never invent a number, workout, or habit entry.
- If a finding says data is insufficient, either omit it or say so plainly
  — never contradict it with a confident claim.
- Use cautious, non-causal language for any habit/workout association
  ("associated with", "tended to") — never "causes".
- This is a fitness assistant, not a medical service — never phrase
  anything as medical certainty or diagnosis.
- Produce at most 6 insights, ranked by what would help this user most
  right now. Prefer fewer, higher-quality insights over padding the list.

USER CONTEXT:
{context_block}

WELLNESS SCORE BREAKDOWN (points earned / max per component):
{wellness_breakdown}

PROGRESSIVE OVERLOAD FINDINGS (per exercise):
{overload_findings}

HABIT/WORKOUT CORRELATION FINDINGS:
{correlation_findings}

EXISTING RULE-BASED SUGGESTIONS:
{suggestions}
"""


async def generate_insights(db, user_id: int, first_name: str | None = None) -> InsightsResponse:
    context = build_user_context(db, user_id, first_name=first_name)
    overload_findings = analyze_progressive_overload(db, user_id)
    correlation_findings = analyze_habit_workout_correlation(db, user_id)

    # wellness_breakdown lives on the analytics response, not on the
    # (deliberately lean) context object — this is the one extra lightweight
    # call, not a duplicated calculation (get_user_analytics is memo-free but
    # cheap; avoiding a second bespoke query path here keeps the score logic
    # single-sourced in analytics_service).
    wellness_breakdown = get_user_analytics(db, user_id).get("wellness_breakdown", [])

    now = datetime.now(timezone.utc)
    context_hash = _context_hash(wellness_breakdown, overload_findings, correlation_findings, context)
    cached = _insight_cache.get(user_id)
    if cached and cached["hash"] == context_hash and (now - cached["ts"]) < timedelta(seconds=CACHE_TTL_SECONDS):
        return cached["data"]

    try:
        prompt = _INSIGHT_PROMPT_TEMPLATE.format(
            context_block=context.to_prompt_context(),
            wellness_breakdown=wellness_breakdown,
            overload_findings=[f["evidence"] for f in overload_findings] or ["No workout history yet."],
            correlation_findings=[f["evidence"] for f in correlation_findings] or ["No paired data yet."],
            suggestions=context.weaknesses or ["None — metrics are on track."],
        )
        result: AIInsightList = await safe_invoke(prompt, structured_model=AIInsightList)
        response = InsightsResponse(
            insights=result.insights[:6],
            generated_at=now.isoformat(),
            source="ai",
        )
    except AIUnavailableError:
        response = InsightsResponse(
            insights=_fallback_insights(context, wellness_breakdown, overload_findings, correlation_findings),
            generated_at=now.isoformat(),
            source="fallback",
        )
    except Exception as exc:  # noqa: BLE001 — malformed structured output or
        # any other unexpected validation failure must degrade gracefully,
        # never surface as a 500 to the frontend.
        print(f"Insight generation failed unexpectedly: {type(exc).__name__}: {exc}")
        response = InsightsResponse(
            insights=_fallback_insights(context, wellness_breakdown, overload_findings, correlation_findings),
            generated_at=now.isoformat(),
            source="fallback",
        )

    _insight_cache[user_id] = {"hash": context_hash, "ts": now, "data": response}
    return response
