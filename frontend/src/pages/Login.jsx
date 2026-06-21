//src/pages/Login.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Login.jsx

Purpose:
Provides secure user authentication
and access to the application.

Functionality:
- Authenticates registered users.
- Validates login credentials.
- Stores JWT tokens.
- Redirects users after login.
- Displays loading states.

Responsibilities:
User authentication
Session initialization
Secure navigation

Used By:
Login page

==================================================
*/
import { useState } from "react";

import { useNavigate, Link } from "react-router-dom";

import { loginUser } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",

    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,

      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const payload = {
        email: formData.email.trim(),

        password: formData.password,
      };

      const response = await loginUser(payload);

      if (!response?.access_token) {
        throw new Error("Invalid login response");
      }

      localStorage.setItem(
        "token",

        response.access_token,
      );

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "Login Error:",

        error,
      );

      alert(error.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <h1>Login</h1>

          <p>Access your AI Gym dashboard</p>
        </div>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          aria-label="Email address"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          aria-label="Password"
          required
        />

        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </form>
    </div>
  );
}
