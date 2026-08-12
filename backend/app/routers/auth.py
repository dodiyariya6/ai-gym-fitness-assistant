# app/routers/auth.py
"""
==================================================
IFA — Intelligent Fitness Assistant

File: auth.py

Purpose:
Defines API endpoints for user authentication and account management.
==================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.schemas.user import UserCreate, UserLogin
from app.models.user import User
from app.database import get_db
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
@limiter.limit("10/minute")
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    existing_username = db.query(User).filter(User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(user.password)

    new_user = User(
        username=user.username,
        email=user.email,
        password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue a token on registration too (identical call to login()) so the
    # frontend can authenticate the user immediately instead of forcing a
    # second, redundant manual login right after they just registered.
    access_token = create_access_token({"sub": new_user.email})

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/login")
@limiter.limit("15/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token({"sub": db_user.email})

    return {"access_token": access_token, "token_type": "bearer"}
