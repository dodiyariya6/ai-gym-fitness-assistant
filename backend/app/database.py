# app/database.py
"""
==================================================
AI Gym & Fitness Assistant

File: database.py

Purpose:
Configures the database connection and
SQLAlchemy session management.

Functionality:
- Loads environment variables.
- Establishes the Neon PostgreSQL connection.
- Creates the SQLAlchemy engine.
- Configures database sessions.
- Defines the Base model.
- Provides database sessions to API routes.

Responsibilities:
Database configuration
Session management
Connection handling
ORM initialization

Used By:
All models
All routers
All services

==================================================
"""

from sqlalchemy import create_engine

from sqlalchemy.orm import sessionmaker, declarative_base

from dotenv import load_dotenv

import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()


def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()
