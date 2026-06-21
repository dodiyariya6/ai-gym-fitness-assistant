// src/services/authService.js
/*
==================================================
AI Gym & Fitness Assistant

File: authService.js

Purpose:
Communicates with the backend
Authentication API.

Functionality:
- Registers new users.
- Authenticates users.
- Returns authentication responses.

Responsibilities:
API communication
User authentication
User registration

Used By:
Login page
Register page

==================================================
*/
import api from "./api";


export const registerUser = async (data) => {

  try {

    const response = await api.post(

      "/auth/register",

      data

    );

    return response.data;

  }

  catch (error) {

    console.error("Auth Service Error:", error);

    throw error;

  }

};


export const loginUser = async (data) => {

  try {

    const response = await api.post(

      "/auth/login",

      data

    );

    return response.data;

  }

  catch (error) {

    console.error("Auth Service Error:", error);

    throw error;

  }

};