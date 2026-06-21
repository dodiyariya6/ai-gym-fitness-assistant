# app/models/user.py
"""
==================================================
AI Gym & Fitness Assistant

File: user.py

Purpose:
Defines the User database model used for user
authentication and account management.

Functionality:
- Stores user account information.
- Stores username, email and password.
- Ensures unique usernames and emails.
- Maintains a one-to-one relationship with Profile.
- Serves as the primary authentication model.

Database Table:
users

Used By:
auth_service.py
auth_router.py
profile_service.py
JWT authentication system

==================================================
"""

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    profile = relationship("Profile", back_populates="user", uselist=False)
