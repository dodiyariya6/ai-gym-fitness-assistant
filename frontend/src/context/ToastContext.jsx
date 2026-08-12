// src/context/ToastContext.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: ToastContext.jsx

Purpose:
Provides a shared, non-blocking notification
mechanism (success / error / warning / info) to
replace native browser alert() calls across the app.

Functionality:
- Exposes toast.success/error/warning/info(message).
- Auto-dismisses toasts after a configurable duration.
- Renders the toast stack via ToastContainer.

Used By:
Login, Register, Dietician, Habits, Workout, Webcam pages

==================================================
*/
import { createContext, useContext, useState, useCallback, useRef } from "react";
import ToastContainer from "../components/common/ToastContainer";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (message, { type = "info", duration = 4500 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const toast = {
    success: (message, opts) => show(message, { ...opts, type: "success" }),
    error: (message, opts) => show(message, { ...opts, type: "error" }),
    warning: (message, opts) => show(message, { ...opts, type: "warning" }),
    info: (message, opts) => show(message, { ...opts, type: "info" }),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
