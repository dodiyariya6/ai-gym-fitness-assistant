//src/services/api.js
/*
==================================================
IFA — Intelligent Fitness Assistant

File: api.js

Purpose:
Creates and configures the central
Axios API client.

Functionality:
- Configures the backend base URL.
- Configures request timeouts.
- Attaches JWT tokens automatically.
- Handles authenticated requests.

Responsibilities:
API configuration
Authentication handling
Request management

Used By:
All frontend service files

==================================================
*/
import axios from "axios";

const api = axios.create({

  baseURL:

    import.meta.env.VITE_API_URL ||

    "http://localhost:8000",

  timeout: 50000,

});

api.interceptors.request.use(

  (config) => {

    const token = localStorage.getItem(

      "token"

    );

    if (token) {

      config.headers =

        config.headers || {};

      config.headers.Authorization =

        `Bearer ${token}`;

    }

    return config;

  },

  (error) => {

    return Promise.reject(error);

  }

);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/" && window.location.pathname !== "/register") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;