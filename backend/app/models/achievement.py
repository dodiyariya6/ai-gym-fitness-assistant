# app/models/achievement.py
"""
==================================================
AI Gym & Fitness Assistant

File: achievement.py

Purpose:
Defines the AchievementProgress database model used
to store and manage achievement progress for users.

Functionality:
- Stores achievement unlock status.
- Tracks current and target progress values.
- Prevents duplicate achievements per user.
- Records achievement unlock timestamps.
- Maintains update timestamps automatically.

Database Table:
achievement_progress

Used By:
achievement_service.py
achievement_router.py

==================================================
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from app.database import Base


class AchievementProgress(Base):
    """
    Persists achievement unlock state per user.
    One row per (user_id, achievement_key).
    Recomputed on every GET /achievements/ call — see achievement_service.py.
    """

    __tablename__ = "achievement_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_key", name="uq_user_achievement"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    achievement_key = Column(String, nullable=False)  # e.g. "first_workout"

    unlocked = Column(Boolean, default=False, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), nullable=True)

    progress_current = Column(Integer, default=0, nullable=False)
    progress_target = Column(Integer, default=1, nullable=False)

    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
