// src/services/chatService.js
/*
==================================================
IFA — Intelligent Fitness Assistant

File: chatService.js

Purpose:
Communicates with the backend
Fitness Chat API.

Functionality:
- Sends user messages, optionally continuing an
  existing chat session (persisted server-side).
- Retrieves AI responses.
- Lists the user's chat sessions.
- Retrieves a session's persisted message history.

Responsibilities:
API communication
Chat management
AI interaction

Used By:
FitnessChat page

==================================================
*/
import api from "./api";

export const sendMessage = async (message, sessionId = null) => {
  try {
    const response = await api.post("/fitness/chat", {
      message,
      session_id: sessionId ?? undefined,
    });
    return response.data;
  } catch (error) {
    console.error("Chat Service Error:", error);
    throw error;
  }
};

export const getChatSessions = async () => {
  try {
    const response = await api.get("/fitness/sessions");
    return response.data;
  } catch (error) {
    console.error("Chat Sessions Error:", error);
    throw error;
  }
};

export const getChatSessionMessages = async (sessionId) => {
  try {
    const response = await api.get(`/fitness/sessions/${sessionId}/messages`);
    return response.data;
  } catch (error) {
    console.error("Chat Session Messages Error:", error);
    throw error;
  }
};
