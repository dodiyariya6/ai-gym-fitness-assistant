// src/components/common/ConfirmDialog.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: ConfirmDialog.jsx

Purpose:
Generic confirmation dialog for destructive (or any
confirm-before-proceeding) actions — the shared
replacement for browser alert()/confirm(), matching the
app's existing toast/modal visual language instead of a
native browser dialog.

Functionality:
- Renders nothing when closed (no DOM/animation cost).
- Shows a title, message, and Confirm/Cancel actions.
- Supports a "danger" style (red confirm button) for
  destructive actions like deletion.
- Disables both actions and shows a loading label while
  the confirm action is in flight.

Used By:
Habits page (delete habit entry)
Workout page (delete workout entry)
Dietician page (delete meal plan)

==================================================
*/
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import "../../styles/confirmDialog.css";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-dialog-card"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog-header">
              <span
                className={`confirm-dialog-icon ${danger ? "confirm-dialog-icon--danger" : ""}`}
              >
                <AlertCircle size={18} />
              </span>
              <h3 id="confirm-dialog-title" className="confirm-dialog-title">
                {title}
              </h3>
            </div>

            {message && <p className="confirm-dialog-message">{message}</p>}

            <div className="confirm-dialog-actions">
              <button
                type="button"
                className={`confirm-dialog-btn ${danger ? "confirm-dialog-btn--danger" : "confirm-dialog-btn--primary"}`}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Deleting…" : confirmLabel}
              </button>
              <button
                type="button"
                className="confirm-dialog-btn confirm-dialog-btn--ghost"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
