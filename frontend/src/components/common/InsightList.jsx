// src/components/common/InsightList.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: InsightList.jsx

Purpose:
Renders a priority-sorted list of structured insights
from GET /analytics/insights (see ai_insight_service.py).
Extracted from Dashboard's original inline InsightItem so
Dashboard, Habits (and any future page) render the exact
same compact insight row instead of duplicating the
sort/cap/render logic.

Functionality:
- Sorts insights high → medium → low priority.
- Optionally caps how many are rendered (`limit`).
- Every field displayed comes straight from the backend
  insight — nothing is reformatted, reworded or
  recalculated here.
- Renders a small empty-state message when there's
  nothing to show, so callers don't need to branch on
  insights.length themselves.

Used By:
Dashboard page ("What to Focus On")
Habits page (habit correlation / consistency insights)

==================================================
*/
import { motion } from "framer-motion";
import "../../styles/insightList.css";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.06 },
  }),
};

function InsightRow({ insight, index }) {
  return (
    <motion.li
      className="insight-list-item"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <span
        className={`insight-list-dot insight-list-dot-${insight.priority}`}
        aria-hidden="true"
      />
      <div className="insight-list-body">
        <div className="insight-list-top-row">
          <p className="insight-list-title">{insight.title}</p>
          <span
            className={`insight-list-priority-badge insight-list-priority-${insight.priority}`}
          >
            {insight.priority}
          </span>
        </div>
        <p className="insight-list-evidence">{insight.evidence}</p>
        <p className="insight-list-recommendation">→ {insight.recommendation}</p>
      </div>
    </motion.li>
  );
}

export default function InsightList({
  insights,
  limit,
  emptyText = "No insights available yet.",
}) {
  const sorted = (insights ?? [])
    .slice()
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
  const items = limit ? sorted.slice(0, limit) : sorted;

  if (items.length === 0) {
    return <p className="insight-list-empty">{emptyText}</p>;
  }

  return (
    <ul className="insight-list">
      {items.map((ins, i) => (
        <InsightRow key={`${ins.category}-${ins.title}-${i}`} insight={ins} index={i} />
      ))}
    </ul>
  );
}
