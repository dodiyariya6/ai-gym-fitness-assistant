// src/pages/Dietician.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: Dietician.jsx

Purpose:
Provides an AI-powered nutrition assistant
for generating personalized meal plans.

Functionality:
- Prefills user data from Profile.
- Generates AI meal plans.
- Generates grocery lists.
- Displays meal cards.
- Displays interactive grocery checklists.
- Supports personalized nutrition goals.
- Supports responsive layouts.

Responsibilities:
Nutrition planning
Meal generation
Grocery generation
Profile integration

Used By:
Dietician page

==================================================
*/
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../layouts/DashboardLayout";
import { generateMealPlan, generateGroceryList } from "../services/dietService";
import { getProfile } from "../services/profileService";
import {
  Sparkles,
  User,
  Ruler,
  Weight,
  Target,
  Leaf,
  ArrowRight,
  ShoppingCart,
  UtensilsCrossed,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Circle,
  ChefHat,
} from "lucide-react";

// ── Animation Variants ────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut", delay: i * 0.06 },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

const slideDown = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: "easeIn" } },
};

// ── Meal icon helper ──────────────────────────────────────────────────────

const mealIcons = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Sunset,
  snack: Moon,
  default: UtensilsCrossed,
};

function getMealIcon(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("breakfast")) return mealIcons.breakfast;
  if (lower.includes("lunch")) return mealIcons.lunch;
  if (lower.includes("dinner")) return mealIcons.dinner;
  if (lower.includes("snack")) return mealIcons.snack;
  return mealIcons.default;
}

// ── Parse meal plan text into structured blocks ───────────────────────────

function parseMealPlan(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  const meals = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading =
      /^\*{0,2}(breakfast|lunch|dinner|snack|meal \d|morning|evening|mid)/i.test(
        trimmed,
      ) ||
      (trimmed.length < 40 && trimmed.endsWith(":"));

    if (isHeading) {
      if (current) meals.push(current);
      current = {
        title: trimmed.replace(/\*+/g, "").replace(/:$/, "").trim(),
        items: [],
      };
    } else if (current && trimmed) {
      current.items.push(trimmed.replace(/^[-•*]\s*/, ""));
    } else if (!current && trimmed) {
      meals.push({ title: "Overview", items: [trimmed] });
    }
  }
  if (current) meals.push(current);
  return meals.length > 0 ? meals : null;
}

// ── Parse grocery list into checkable items ───────────────────────────────

function parseGrocery(text) {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^[-•*\d.]+\s*/, ""))
    .filter(Boolean);
}

// ── Sub-components ────────────────────────────────────────────────────────

function InputField({
  label,
  icon: Icon,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
}) {
  return (
    <div className="diet-input-group">
      <label className="diet-label" htmlFor={`diet-${name}`}>
        {Icon && <Icon size={13} />}
        {label}
      </label>
      <input
        id={`diet-${name}`}
        className="diet-input"
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
      />
    </div>
  );
}

function MealCard({ meal, index }) {
  const Icon = getMealIcon(meal.title);
  return (
    <motion.div
      className="meal-card"
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <div className="meal-card-header">
        <div className="meal-icon-wrap">
          <Icon size={16} />
        </div>
        <h4 className="meal-card-title">{meal.title}</h4>
      </div>
      <ul className="meal-card-items">
        {meal.items.map((item, i) => (
          <li key={i} className="meal-card-item">
            <span className="meal-item-dot" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function GroceryItem({ item, index }) {
  const [checked, setChecked] = useState(false);
  return (
    <motion.li
      className={`grocery-item${checked ? " checked" : ""}`}
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      onClick={() => setChecked((c) => !c)}
    >
      <span className="grocery-check-icon">
        {checked ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      </span>
      <span className="grocery-item-text">{item}</span>
    </motion.li>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Dietician() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
    goal: "",
    diet_type: "",
  });
  const [mealPlan, setMealPlan] = useState("");
  const [groceryList, setGroceryList] = useState("");
  const [loading, setLoading] = useState(false);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // ── Prefill from Profile if available ─────────────────────────────────────
  // Runs once on mount. If a profile exists, fills Age / Gender / Height / Weight.
  // User can still edit every field freely — this just saves re-typing.
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        if (profile) {
          setFormData((prev) => ({
            ...prev,
            age: profile.age ? String(profile.age) : prev.age,
            gender: profile.gender ? profile.gender : prev.gender,
            height: profile.height ? String(profile.height) : prev.height,
            weight: profile.weight ? String(profile.weight) : prev.weight,
          }));
          setPrefilled(true);
        }
      } catch {
        // No profile yet — form stays blank, user fills manually. No error shown.
      }
    })();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMealPlan = async () => {
    const { age, gender, height, weight, goal, diet_type } = formData;
    if (!age || !gender || !height || !weight || !goal || !diet_type) {
      alert("Please fill all fields.");
      return;
    }
    try {
      setLoading(true);
      const result = await generateMealPlan(formData);
      if (result?.meal_plan) {
        setMealPlan(result.meal_plan);
        setGroceryList("");
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to generate meal plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleGrocery = async () => {
    try {
      setGroceryLoading(true);
      const result = await generateGroceryList(mealPlan);
      if (result?.grocery_list) {
        setGroceryList(result.grocery_list);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to generate grocery list.");
    } finally {
      setGroceryLoading(false);
    }
  };

  const parsedMeals = mealPlan ? parseMealPlan(mealPlan) : null;
  const parsedGrocery = groceryList ? parseGrocery(groceryList) : null;

  return (
    <DashboardLayout>
      <div className="diet-root">
        {/* ── Hero ──────────────────────────────────────────── */}
        <motion.section
          className="diet-hero"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="diet-hero-blob diet-blob-1" aria-hidden="true" />
          <div className="diet-hero-blob diet-blob-2" aria-hidden="true" />

          <div className="diet-hero-content">
            <motion.span
              className="diet-eyebrow"
              variants={fadeUp}
              custom={0}
              initial="hidden"
              animate="visible"
            >
              <Sparkles size={12} />
              AI-Powered Nutrition
            </motion.span>

            <motion.h1
              className="diet-heading"
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="visible"
            >
              Your Personal
              <br />
              AI Dietician
            </motion.h1>

            <motion.p
              className="diet-subtext"
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="visible"
            >
              Get a personalized meal plan tailored to your body, goals, and
              dietary preferences — generated in seconds.
            </motion.p>

            <motion.div
              className="diet-hero-pills"
              variants={fadeUp}
              custom={3}
              initial="hidden"
              animate="visible"
            >
              <div className="diet-pill">
                <span className="pill-dot dot-indigo" />
                <span>Personalized plans</span>
              </div>
              <div className="diet-pill">
                <span className="pill-dot dot-green" />
                <span>Macro-balanced</span>
              </div>
              <div className="diet-pill">
                <span className="pill-dot dot-cyan" />
                <span>Smart grocery lists</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Input Form ────────────────────────────────────── */}
        <motion.section
          className="diet-form-card"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <div className="diet-form-header">
            <div className="diet-form-title-row">
              <ChefHat size={18} className="diet-form-icon" />
              <div>
                <h3 className="diet-form-title">Build Your Plan</h3>
                <p className="diet-form-subtitle">
                  {prefilled
                    ? "Fields prefilled from your Profile — edit freely if needed."
                    : "Tell us about yourself and we'll do the rest."}
                </p>
              </div>
            </div>
          </div>

          {/* Personal metrics row */}
          <div className="diet-fields-section">
            <p className="diet-fields-label">Personal metrics</p>
            <div className="diet-fields-grid diet-fields-4">
              <InputField
                label="Age"
                icon={User}
                name="age"
                type="number"
                placeholder="e.g. 25"
                value={formData.age}
                onChange={handleChange}
              />
              <div className="diet-input-group">
                <label className="diet-label" htmlFor="diet-gender">
                  <User size={13} />
                  Gender
                </label>
                <select
                  id="diet-gender"
                  className="diet-input"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>
              <InputField
                label="Height (cm)"
                icon={Ruler}
                name="height"
                type="number"
                placeholder="e.g. 175"
                value={formData.height}
                onChange={handleChange}
              />
              <InputField
                label="Weight (kg)"
                icon={Weight}
                name="weight"
                type="number"
                placeholder="e.g. 70"
                value={formData.weight}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Goals row */}
          <div className="diet-fields-section">
            <p className="diet-fields-label">Goals &amp; preferences</p>
            <div className="diet-fields-grid diet-fields-2">
              <InputField
                label="Fitness Goal"
                icon={Target}
                name="goal"
                placeholder="e.g. Weight Loss, Muscle Gain"
                value={formData.goal}
                onChange={handleChange}
              />
              <InputField
                label="Diet Type"
                icon={Leaf}
                name="diet_type"
                placeholder="e.g. Vegetarian, Vegan, Non-Veg"
                value={formData.diet_type}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            className="diet-generate-btn"
            onClick={handleMealPlan}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Generating your plan...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate My Meal Plan
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </motion.section>

        {/* ── Meal Plan Results ──────────────────────────────── */}
        <AnimatePresence>
          {mealPlan && (
            <motion.section
              className="diet-results-section"
              variants={slideDown}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="diet-results-header">
                <div className="diet-results-title-row">
                  <UtensilsCrossed size={18} className="diet-form-icon" />
                  <div>
                    <h3 className="diet-form-title">Your Meal Plan</h3>
                    <p className="diet-form-subtitle">
                      Tailored to your body and goals
                    </p>
                  </div>
                </div>
              </div>

              {parsedMeals ? (
                <div className="meal-cards-grid">
                  {parsedMeals.map((meal, i) => (
                    <MealCard key={i} meal={meal} index={i} />
                  ))}
                </div>
              ) : (
                <div className="meal-raw-output">
                  <pre className="meal-output">{mealPlan}</pre>
                </div>
              )}

              {/* Grocery CTA */}
              {!groceryList && (
                <motion.div
                  className="grocery-cta"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                >
                  <div className="grocery-cta-text">
                    <ShoppingCart size={16} />
                    <div>
                      <p className="grocery-cta-title">Generate Grocery List</p>
                      <p className="grocery-cta-subtitle">
                        Get all the ingredients for this plan in one click.
                      </p>
                    </div>
                  </div>
                  <button
                    className="diet-generate-btn diet-btn-secondary"
                    onClick={handleGrocery}
                    disabled={groceryLoading}
                    type="button"
                  >
                    {groceryLoading ? (
                      <>
                        <span className="spinner spinner-dark" />
                        Building list...
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={14} />
                        Generate List
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Grocery List ───────────────────────────────────── */}
        <AnimatePresence>
          {groceryList && (
            <motion.section
              className="diet-grocery-section"
              variants={slideDown}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="diet-results-header">
                <div className="diet-results-title-row">
                  <ShoppingCart size={18} className="diet-form-icon" />
                  <div>
                    <h3 className="diet-form-title">Grocery List</h3>
                    <p className="diet-form-subtitle">
                      Check items off as you shop
                    </p>
                  </div>
                </div>
              </div>

              {parsedGrocery ? (
                <ul className="grocery-list">
                  {parsedGrocery.map((item, i) => (
                    <GroceryItem key={`${item}-${i}`} item={item} index={i} />
                  ))}
                </ul>
              ) : (
                <pre className="meal-output">{groceryList}</pre>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
