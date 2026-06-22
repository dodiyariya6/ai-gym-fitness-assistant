// src/pages/Profile.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Profile.jsx

Purpose:
Manages user profile information and
serves as the single source of truth
for personalization.

Functionality:
- Displays profile information.
- Supports profile editing.
- Manages fitness goals.
- Manages activity levels.
- Generates AI daily targets.
- Displays health metrics.
- Displays personalized recommendations.
- Supports responsive layouts.

Responsibilities:
Profile management
Personalization
Target generation
Settings management

Used By:
Profile page

==================================================
*/
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  getProfile,
  saveProfile,
  generateTargets,
} from "../services/profileService";
import { Droplets, Moon, Footprints, Flame, Cpu } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_GROUPS = [
  {
    label: "Body Goals",
    goals: [
      "Weight Loss",
      "Fat Loss",
      "Muscle Gain",
      "Body Recomposition",
      "Maintenance",
    ],
  },
  {
    label: "Fitness Goals",
    goals: [
      "Strength Training",
      "Endurance Training",
      "Improve Stamina",
      "Athletic Performance",
      "Flexibility & Mobility",
    ],
  },
  {
    label: "Lifestyle Goals",
    goals: ["General Fitness", "Healthy Lifestyle"],
  },
];

const ACTIVITY_LEVELS = [
  "Sedentary",
  "Light",
  "Moderate",
  "Active",
  "Very Active",
];

const AVATAR_COLORS = [
  { bg: "#E8D5F5", text: "#7B2FBE" },
  { bg: "#D0EBFF", text: "#1971C2" },
  { bg: "#C3FAE8", text: "#0CA678" },
  { bg: "#FFE8CC", text: "#E67700" },
  { bg: "#FFDEEB", text: "#C2255C" },
  { bg: "#E5DBFF", text: "#6741D9" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAvatarColor(seed) {
  if (!seed) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name || !name.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const EMPTY_PROFILE = {
  name: "",
  email: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  city: "",
  state: "",
  country: "",
  fitness_goals: [],
  activity_level: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [targets, setTargets] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProfile();
      if (data) {
        setForm({
          name: data.name || "",
          email: data.email || "",
          age: data.age ?? "",
          gender: data.gender || "",
          height: data.height ?? "",
          weight: data.weight ?? "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          fitness_goals: data.fitness_goals || [],
          activity_level: data.activity_level || "",
        });
        if (data.water_goal) {
          setTargets({
            water_goal: data.water_goal,
            sleep_goal: data.sleep_goal,
            step_goal: data.step_goal,
            calorie_goal: data.calorie_goal,
          });
        }
      } else {
        setIsEditing(true);
      }
    } catch {
      setError("Could not load profile. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  function handleGoalToggle(goal) {
    setForm((prev) => {
      const current = prev.fitness_goals;
      if (current.includes(goal)) {
        return { ...prev, fitness_goals: current.filter((g) => g !== goal) };
      }
      if (current.length >= 3) {
        setError("Maximum 3 goals allowed.");
        return prev;
      }
      setError("");
      return { ...prev, fitness_goals: [...current, goal] };
    });
  }

  function handleActivitySelect(level) {
    if (!isEditing) return;
    setForm((prev) => ({ ...prev, activity_level: level }));
  }

  async function handleSave() {
    if (form.fitness_goals.length < 1) {
      setError("Please select at least 1 fitness goal.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        age: form.age !== "" ? parseInt(form.age, 10) : null,
        height: form.height !== "" ? parseFloat(form.height) : null,
        weight: form.weight !== "" ? parseFloat(form.weight) : null,
      };
      delete payload.email;
      await saveProfile(payload);
      setSuccess("Profile saved!");
      setIsEditing(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateTargets() {
    try {
      setGenerating(true);
      setError("");
      const data = await generateTargets();
      setTargets({
        water_goal: data.water_goal,
        sleep_goal: data.sleep_goal,
        step_goal: data.step_goal,
        calorie_goal: data.calorie_goal,
        bmi: data.bmi,
        bmi_category: data.bmi_category,
        bmr: data.bmr,
        tdee: data.tdee,
        reasoning: data.reasoning,
      });
      setSuccess("Targets generated and saved!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(
        err.message ||
          "Could not generate targets. Ensure profile is saved first.",
      );
    } finally {
      setGenerating(false);
    }
  }

  const canGenerateTargets =
    !isEditing &&
    form.age !== "" &&
    form.weight !== "" &&
    form.height !== "" &&
    form.gender !== "";

  const avatarColor = getAvatarColor(form.name || form.email);
  const initials = getInitials(form.name);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="profile-loading">Loading your profile…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="profile-root">
        {/* ── Avatar Header ─────────────────────────────────────────────── */}
        <div className="profile-header">
          <div
            className="profile-avatar"
            style={{ background: avatarColor.bg, color: avatarColor.text }}
            aria-label={`Avatar for ${form.name}`}
          >
            {initials}
          </div>
          <div className="profile-header-info">
            <h2 className="profile-display-name">
              {form.name || "Your Profile"}
            </h2>
            <p className="profile-display-email">{form.email}</p>
          </div>
        </div>

        {/* ── Status Banners ────────────────────────────────────────────── */}
        {error && (
          <div className="profile-banner profile-banner-error">{error}</div>
        )}
        {success && (
          <div className="profile-banner profile-banner-success">{success}</div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1 — PERSONAL INFORMATION
        ════════════════════════════════════════════════════════════════ */}
        <section className="profile-section">
          <h3 className="profile-section-title">Personal Information</h3>

          <div className="profile-grid-2">
            <div className="profile-field">
              <label htmlFor="p-name">Full Name</label>
              <input
                id="p-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. Rahul Desai"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="p-email">Email</label>
              <input
                id="p-email"
                name="email"
                type="email"
                value={form.email}
                disabled
                placeholder="Set at registration"
                title="Email cannot be changed here"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="p-age">Age</label>
              <input
                id="p-age"
                name="age"
                type="number"
                min="10"
                max="120"
                value={form.age}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. 28"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="p-gender">Gender</label>
              <select
                id="p-gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>

            <div className="profile-field">
              <label htmlFor="p-height">Height (cm)</label>
              <input
                id="p-height"
                name="height"
                type="number"
                min="50"
                max="300"
                value={form.height}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. 175"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="p-weight">Weight (kg)</label>
              <input
                id="p-weight"
                name="weight"
                type="number"
                min="20"
                max="500"
                value={form.weight}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. 70"
              />
            </div>
          </div>

          <p className="profile-sub-label">
            Location <span className="profile-optional">(optional)</span>
          </p>
          <div className="profile-grid-3">
            <div className="profile-field">
              <label htmlFor="p-city">City</label>
              <input
                id="p-city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. Hyderabad"
              />
            </div>
            <div className="profile-field">
              <label htmlFor="p-state">State</label>
              <input
                id="p-state"
                name="state"
                type="text"
                value={form.state}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. Telangana"
              />
            </div>
            <div className="profile-field">
              <label htmlFor="p-country">Country</label>
              <input
                id="p-country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="e.g. India"
              />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2 — FITNESS GOALS
        ════════════════════════════════════════════════════════════════ */}
        <section className="profile-section">
          <h3 className="profile-section-title">
            Fitness Goals
            <span className="profile-goal-badge">
              {form.fitness_goals.length} / 3 selected
            </span>
          </h3>
          <p className="profile-hint">
            Select 1–3 goals that best match your focus.
          </p>

          {GOAL_GROUPS.map((group) => (
            <div key={group.label} className="profile-goal-group">
              <p className="profile-goal-group-label">{group.label}</p>
              <div className="profile-chips">
                {group.goals.map((goal) => {
                  const selected = form.fitness_goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      disabled={!isEditing}
                      className={`profile-chip${selected ? " profile-chip-selected" : ""}`}
                      onClick={() => isEditing && handleGoalToggle(goal)}
                      aria-pressed={selected}
                    >
                      {goal}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3 — ACTIVITY LEVEL
        ════════════════════════════════════════════════════════════════ */}
        <section className="profile-section">
          <h3 className="profile-section-title">Activity Level</h3>
          <div className="profile-chips">
            {ACTIVITY_LEVELS.map((level) => {
              const selected = form.activity_level === level;
              return (
                <button
                  key={level}
                  type="button"
                  disabled={!isEditing}
                  className={`profile-chip${selected ? " profile-chip-selected" : ""}`}
                  onClick={() => handleActivitySelect(level)}
                  aria-pressed={selected}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4 — PERSONALIZED DAILY TARGETS
        ════════════════════════════════════════════════════════════════ */}
        <section className="profile-section">
          <h3 className="profile-section-title">Personalized Daily Targets</h3>
          <p className="profile-hint">
            Generated using BMI, BMR, TDEE and Activity Level.
          </p>

          {targets ? (
            <div className="profile-targets-wrap">
              {/* Target cards */}
              <div className="profile-targets-grid">
                <div className="profile-target-card">
                  <span className="profile-target-icon-wrap profile-target-icon-cyan">
                    <Droplets size={18} />
                  </span>
                  <div>
                    <p className="profile-target-label">Water Goal</p>
                    <p className="profile-target-value">
                      {targets.water_goal} L / day
                    </p>
                  </div>
                </div>

                <div className="profile-target-card">
                  <span className="profile-target-icon-wrap profile-target-icon-violet">
                    <Moon size={18} />
                  </span>
                  <div>
                    <p className="profile-target-label">Sleep Goal</p>
                    <p className="profile-target-value">
                      {targets.sleep_goal} hrs / night
                    </p>
                  </div>
                </div>

                <div className="profile-target-card">
                  <span className="profile-target-icon-wrap profile-target-icon-indigo">
                    <Footprints size={18} />
                  </span>
                  <div>
                    <p className="profile-target-label">Step Goal</p>
                    <p className="profile-target-value">
                      {targets.step_goal?.toLocaleString()} steps / day
                    </p>
                  </div>
                </div>

                <div className="profile-target-card">
                  <span className="profile-target-icon-wrap profile-target-icon-amber">
                    <Flame size={18} />
                  </span>
                  <div>
                    <p className="profile-target-label">
                      Daily Calorie Requirement (TDEE)
                    </p>
                    <p className="profile-target-value">
                      {targets.calorie_goal?.toLocaleString()} kcal / day
                    </p>
                  </div>
                </div>
              </div>

              {/* Simplified reasoning strip */}
              {targets.reasoning && (
                <div className="profile-reasoning">
                  <p className="profile-reasoning-title">
                    <Cpu size={13} />
                    How these were calculated
                  </p>
                  <div className="profile-reasoning-pills">
                    {targets.bmi && (
                      <span className="profile-reasoning-pill">
                        BMI {targets.bmi} · {targets.bmi_category}
                      </span>
                    )}
                    {targets.bmr && (
                      <span className="profile-reasoning-pill">
                        BMR {targets.bmr} kcal
                      </span>
                    )}
                    {targets.tdee && (
                      <span className="profile-reasoning-pill">
                        TDEE {targets.tdee} kcal
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="profile-actions">
                <button
                  className="profile-btn profile-btn-outline"
                  onClick={handleGenerateTargets}
                  disabled={generating || !canGenerateTargets}
                  type="button"
                >
                  {generating ? "Regenerating…" : "Regenerate Targets"}
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-targets-empty">
              <p>
                Save your profile first, then generate your personalised
                targets.
              </p>
              <button
                className="profile-btn profile-btn-primary"
                onClick={handleGenerateTargets}
                disabled={generating || !canGenerateTargets}
                type="button"
              >
                {generating ? "Generating…" : "Generate Targets"}
              </button>
              {!canGenerateTargets && (
                <p className="profile-hint" style={{ marginTop: "0.5rem" }}>
                  Age, Gender, Height, and Weight are required.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 5 — SETTINGS
        ════════════════════════════════════════════════════════════════ */}
        <section className="profile-section">
          <h3 className="profile-section-title">Settings</h3>
          <div className="profile-actions">
            {isEditing ? (
              <>
                <button
                  className="profile-btn profile-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  className="profile-btn profile-btn-ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setError("");
                    loadProfile();
                  }}
                  disabled={saving}
                  type="button"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="profile-btn profile-btn-primary"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                Edit Profile
              </button>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
