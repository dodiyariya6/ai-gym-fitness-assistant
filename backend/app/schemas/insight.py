# app/schemas/insight.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: insight.py  (schemas)

Purpose:
Defines the structured AI insight contract returned
by /analytics/insights. Every insight must be traceable
to deterministic evidence — this schema is also the
structured-output contract handed to Gemini via
with_structured_output(), so a malformed AI response
fails validation instead of reaching the frontend as
free text to be regex-parsed.

Data Models:
AIInsight
AIInsightList  (Gemini structured-output envelope)
InsightsResponse

Used By:
ai_insight_service.py
analytics.py router

==================================================
"""

from typing import List, Literal, Optional
from pydantic import BaseModel


class AIInsight(BaseModel):
    category: Literal[
        "wellness",
        "recovery",
        "progressive_overload",
        "habit_correlation",
        "consistency",
        "nutrition",
        "general",
    ]
    priority: Literal["high", "medium", "low"]
    title: str
    evidence: str
    recommendation: str
    expected_benefit: Optional[str] = None
    action: Optional[str] = None


class AIInsightList(BaseModel):
    """
    Envelope model — langchain's with_structured_output() requires a single
    top-level Pydantic model, so Gemini's response is validated as
    {"insights": [...]} rather than a bare list.
    """

    insights: List[AIInsight]


class InsightsResponse(BaseModel):
    insights: List[AIInsight]
    generated_at: str
    source: Literal["ai", "fallback"]
