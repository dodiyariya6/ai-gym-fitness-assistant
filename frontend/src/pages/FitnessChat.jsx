// src/pages/FitnessChat.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: FitnessChat.jsx

Purpose:
Provides an AI-powered fitness assistant
for personalized workout and nutrition guidance.

Functionality:
- Displays AI conversations.
- Sends user messages.
- Renders AI responses.
- Supports markdown formatting.
- Displays suggested prompts.
- Shows typing indicators.
- Supports chat reset.
- Supports responsive layouts.

Responsibilities:
AI interaction
Fitness guidance
Conversation management
Message rendering

Used By:
Fitness Chat page

==================================================
*/
import { useState, useEffect, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  Sparkles,
  Send,
  RotateCcw,
  User,
  Dumbbell,
  Salad,
  Flame,
  Activity,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

import { sendMessage } from "../services/chatService";

/* ================================================
   Markdown Renderer
   (logic unchanged — formatting only)
================================================ */

function MarkdownRenderer({ text }) {
  let keyId = 0;

  const k = () => `md-${keyId++}`;

  function parseInline(str) {
    const out = [];

    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;

    let last = 0;

    let m;

    while ((m = re.exec(str)) !== null) {
      if (m.index > last) {
        out.push(
          str.slice(
            last,

            m.index,
          ),
        );
      }

      if (m[2]) {
        out.push(<strong key={k()}>{m[2]}</strong>);
      } else if (m[3]) {
        out.push(<em key={k()}>{m[3]}</em>);
      } else if (m[4]) {
        out.push(
          <code key={k()} className="md-inline-code">
            {m[4]}
          </code>,
        );
      }

      last = m.index + m[0].length;
    }

    if (last < str.length) {
      out.push(str.slice(last));
    }

    return out;
  }

  const lines = text.split("\n");

  const blocks = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;

      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)/);

    if (heading) {
      const level = heading[1].length;

      blocks.push(
        <p key={k()} className={`md-h${level}`}>
          {parseInline(heading[2])}
        </p>,
      );

      i++;

      continue;
    }

    if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={k()} className="md-hr" />);

      i++;

      continue;
    }

    if (/^[\*\-]\s+/.test(line)) {
      const items = [];

      while (i < lines.length && /^[\*\-]\s+/.test(lines[i])) {
        items.push(
          <li key={k()}>
            {parseInline(
              lines[i].replace(
                /^[\*\-]\s+/,

                "",
              ),
            )}
          </li>,
        );

        i++;
      }

      blocks.push(
        <ul key={k()} className="md-ul">
          {items}
        </ul>,
      );

      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];

      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={k()}>
            {parseInline(
              lines[i].replace(
                /^\d+\.\s+/,

                "",
              ),
            )}
          </li>,
        );

        i++;
      }

      blocks.push(
        <ol key={k()} className="md-ol">
          {items}
        </ol>,
      );

      continue;
    }

    blocks.push(
      <p key={k()} className="md-p">
        {parseInline(line)}
      </p>,
    );

    i++;
  }

  return <div className="md-body">{blocks}</div>;
}

/* ================================================
   Timestamp
================================================ */

function MsgTime({ ts }) {
  const label = new Date(ts).toLocaleTimeString(
    [],

    {
      hour: "2-digit",

      minute: "2-digit",
    },
  );

  return <span className="msg-time">{label}</span>;
}

/* ================================================
   Typing Indicator
================================================ */

function TypingBubble() {
  return (
    <motion.div
      className="bubble-row bubble-row--ai"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      <div className="bubble-avatar bubble-avatar--ai">
        <Sparkles size={16} />
      </div>

      <div className="ai-message typing-bubble">
        <span className="typing-dot" />

        <span className="typing-dot" />

        <span className="typing-dot" />
      </div>
    </motion.div>
  );
}

/* ================================================
   Message Bubble
================================================ */

function MessageBubble({ msg }) {
  const isUser = msg.sender === "user";

  return (
    <motion.div
      className={`bubble-row ${isUser ? "bubble-row--user" : "bubble-row--ai"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div
        className={`bubble-avatar ${isUser ? "bubble-avatar--user" : "bubble-avatar--ai"}`}
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>

      <div
        className={`bubble-body ${
          isUser ? "bubble-body--user" : "bubble-body--ai"
        }`}
      >
        <div className={isUser ? "user-message" : "ai-message"}>
          {isUser ? (
            <p className="md-p">{msg.text}</p>
          ) : (
            <MarkdownRenderer text={msg.text} />
          )}
        </div>

        <MsgTime ts={msg.ts} />
      </div>
    </motion.div>
  );
}

/* ================================================
   Defaults
   (unchanged — same copy, same data)
================================================ */

const WELCOME_MSG = {
  sender: "ai",

  text: "Hi, I'm your AI Fitness Coach. Ask me anything about workouts, nutrition, fat loss, muscle gain or fitness.",

  ts: Date.now(),
};

const SUGGESTIONS = [
  "How do I lose belly fat?",

  "Create a beginner workout plan",

  "High protein vegetarian foods",

  "How much protein do I need?",
];

// Presentation-only icon mapping for the suggestion cards above.
// Purely visual — does not touch the SUGGESTIONS data itself.
const SUGGESTION_ICONS = [Flame, Dumbbell, Salad, Activity];

const HERO_PILLS = [
  { label: "Workout Plans", icon: Dumbbell },
  { label: "Nutrition Guidance", icon: Salad },
  { label: "Progress & Recovery", icon: Activity },
];

/* ================================================
   Main Page
================================================ */

export default function FitnessChat() {
  const [messages, setMessages] = useState([WELCOME_MSG]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([WELCOME_MSG]);

    setInput("");
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();

    setMessages((prev) => [
      ...prev,

      {
        sender: "user",

        text: userText,

        ts: Date.now(),
      },
    ]);

    setInput("");

    setLoading(true);

    try {
      const response = await sendMessage(userText);

      const aiReply = response?.reply
        ? response.reply
        : "No response received.";

      setMessages((prev) => [
        ...prev,

        {
          sender: "ai",

          text: aiReply,

          ts: Date.now(),
        },
      ]);
    } catch (error) {
      console.error(
        "Chat Error:",

        error,
      );

      setMessages((prev) => [
        ...prev,

        {
          sender: "ai",

          text: "Unable to connect to AI assistant.",

          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      handleSend();
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <DashboardLayout>
      <div className="fitness-chat-page">
        {/* ───────────────── Hero ───────────────── */}
        <motion.section
          className="chat-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <div className="chat-hero-accent chat-hero-accent--a" />
          <div className="chat-hero-accent chat-hero-accent--b" />

          <div className="chat-hero-content">
            <div className="chat-hero-text">
              <span className="chat-hero-eyebrow">
                <Sparkles size={14} />
                AI Wellness Coach
              </span>

              <h1 className="chat-hero-title">Your AI Fitness Coach</h1>

              <p className="chat-hero-subtitle">
                Personalized guidance on workouts, nutrition and recovery,
                shaped around your goals.
              </p>

              <div className="chat-hero-pills">
                {HERO_PILLS.map(({ label, icon: Icon }) => (
                  <span className="hero-pill" key={label}>
                    <Icon size={14} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="chat-hero-actions">
              <span className="hero-status">
                <span className="status-dot" />
                Powered by Gemini AI
              </span>

              <button
                type="button"
                className="hero-reset-btn"
                onClick={clearChat}
              >
                <RotateCcw size={15} />
                New Conversation
              </button>
            </div>
          </div>
        </motion.section>

        {/* ───────────────── Chat Panel ───────────────── */}
        <motion.div
          className="chat-container"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeInOut" }}
        >
          {showSuggestions && (
            <motion.div
              className="suggestion-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15, ease: "easeInOut" }}
            >
              <h3>Start a Conversation</h3>

              <p>Ask anything about fitness, nutrition or workouts.</p>

              <div className="suggestion-grid">
                {SUGGESTIONS.map((s, idx) => {
                  const Icon = SUGGESTION_ICONS[idx];

                  return (
                    <motion.button
                      key={s}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => setInput(s)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: 0.18 + idx * 0.05,
                        ease: "easeInOut",
                      }}
                      whileHover={{ y: -3 }}
                    >
                      <span className="suggestion-chip-icon">
                        <Icon size={16} />
                      </span>
                      {s}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="chat-messages">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={`${msg.sender}-${msg.ts}-${idx}`}
                  msg={msg}
                />
              ))}

              {loading && <TypingBubble key="typing" />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={input}
              aria-label="Fitness chat input"
              placeholder="Ask your fitness question..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
            />

            <button onClick={handleSend} disabled={loading}>
              {loading ? (
                "Thinking..."
              ) : (
                <>
                  <Send size={16} />
                  Send
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
