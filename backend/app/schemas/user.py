# app/schemas/user.py
"""
==================================================
AI Gym & Fitness Assistant

File: user.py

Purpose:
Defines Pydantic schemas used for user
registration and authentication.

Functionality:
- Validates user registration data.
- Validates login credentials.
- Enforces username constraints.
- Validates email formats.
- Enforces password requirements.
- Standardizes authentication data exchanged between backend and frontend.

Data Models:
UserCreate
UserLogin

Used By:
auth_service.py
auth.py router
Login page
Register page
JWT authentication system

==================================================
"""

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):

    username: str = Field(min_length=3, max_length=50)

    email: EmailStr

    password: str = Field(min_length=6)


class UserLogin(BaseModel):

    email: EmailStr

    password: str = Field(min_length=6)
