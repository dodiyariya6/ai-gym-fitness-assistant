// src/components/common/ToastContainer.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: ToastContainer.jsx

Purpose:
Renders the active toast stack in a fixed
viewport, animated with the app's existing
Framer Motion setup.

UI Features:
Non-blocking notifications
Auto-dismiss
Manual dismiss
Accessible live regions

Used By:
ToastContext (mounted once via ToastProvider)

==================================================
*/
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-viewport" role="region" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          // Errors interrupt assistive tech immediately; everything else
          // is announced politely so it doesn't talk over the user.
          const isError = t.type === "error";

          return (
            <motion.div
              key={t.id}
              className={`toast toast--${t.type}`}
              role={isError ? "alert" : "status"}
              aria-live={isError ? "assertive" : "polite"}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <span className="toast-icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="toast-message">{t.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
