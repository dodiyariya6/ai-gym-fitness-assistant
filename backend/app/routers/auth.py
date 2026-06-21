# app/routers/auth.py
"""
==================================================
AI Gym & Fitness Assistant

File: auth.py

Purpose:
Defines API endpoints for user authentication
and account management.

Functionality:
- Registers new users.
- Validates unique usernames and emails.
- Authenticates existing users.
- Generates JWT access tokens.
- Provides secure login functionality.

API Base Route:
/auth

Used By:
Login page
Register page
JWT authentication system
Protected routes

==================================================
"""

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, UserLogin

from app.models.user import User

from app.database import get_db

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):

    existing_username = db.query(User).filter(User.username == user.username).first()

    if existing_username:

        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == user.email).first()

    if existing_email:

        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(user.password)

    new_user = User(username=user.username, email=user.email, password=hashed_password)

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
    }


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:

        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user.password, db_user.password):

        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": db_user.email})

    return {"access_token": access_token, "token_type": "bearer"}
