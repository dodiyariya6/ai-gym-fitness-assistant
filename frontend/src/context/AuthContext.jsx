// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Single source of truth for auth state. Initialized synchronously from
  // localStorage so a page refresh restores the correct state immediately
  // (no flash of "logged out" before an effect runs).
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  // isAuthenticated is derived directly from token on every render instead
  // of being mirrored into its own state — avoids two pieces of state ever
  // disagreeing with each other.
  const isAuthenticated = Boolean(token);

  const login = useCallback((newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
