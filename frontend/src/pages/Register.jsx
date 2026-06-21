// src/pages/Register.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Register.jsx

Purpose:
Provides secure user registration
for new accounts.

Functionality:
- Creates new user accounts.
- Validates registration data.
- Sends registration requests.
- Displays loading states.
- Redirects users after registration.

Responsibilities:
User registration
Input validation
Account creation

Used By:
Register page

==================================================
*/
import { useState } from "react";

import { useNavigate, Link } from "react-router-dom";

import { registerUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",

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
        username: formData.username.trim(),

        email: formData.email.trim(),

        password: formData.password,
      };

      if (!payload.username || !payload.email || !payload.password) {
        throw new Error("Please fill all fields.");
      }

      await registerUser(payload);

      alert("Registration successful. Please login.");

      navigate("/");
    } catch (error) {
      console.error(
        "Registration Error:",

        error,
      );

      alert(
        error.response?.data?.detail ||
          error.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <h1>Register</h1>

          <p>Create your AI Gym account</p>
        </div>

        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          autoComplete="username"
          aria-label="Username"
          required
        />

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
          autoComplete="new-password"
          aria-label="Password"
          required
        />

        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </form>
    </div>
  );
}
