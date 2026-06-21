# app/services/auth_service.py
"""
==================================================
AI Gym & Fitness Assistant

File: auth_service.py

Purpose:
Provides authentication utilities for user
security, password management and JWT handling.

Functionality:
- Hashes user passwords.
- Verifies passwords.
- Creates JWT access tokens.
- Authenticates users.
- Retrieves the current authenticated user.
- Loads authentication environment variables.

Responsibilities:
Password security
JWT token generation
User authentication
Protected route access

Used By:
auth.py router
All protected routes
JWT authentication system

==================================================
"""

import os

from datetime import datetime, timedelta

from dotenv import load_dotenv

from jose import jwt, JWTError

from passlib.context import CryptContext

from fastapi import Depends, HTTPException

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import User

load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str):

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):

    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=401, detail="Could not validate credentials"
    )

    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        email = payload.get("sub")

        if email is None:

            raise credentials_exception

    except JWTError:

        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()

    if user is None:

        raise credentials_exception

    return user
