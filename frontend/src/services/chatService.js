// src/services/chatService.js
/*
==================================================
AI Gym & Fitness Assistant

File: chatService.js

Purpose:
Communicates with the backend
Fitness Chat API.

Functionality:
- Sends user messages.
- Retrieves AI responses.
- Returns chatbot replies.

Responsibilities:
API communication
Chat management
AI interaction

Used By:
FitnessChat page

==================================================
*/
import api from "./api";

export const sendMessage = async (message) => {

  try {

    const response = await api.post(

      "/fitness/chat",

      {

        message

      }

    );

    return response.data;

  }

  catch (error) {

    console.error(

      "Chat Service Error:",

      error

    );

    throw error;

  }

};