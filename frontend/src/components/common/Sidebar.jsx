// src/components/common/Sidebar.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: Sidebar.jsx

Purpose:
Displays the application's primary
navigation menu.

Functionality:
- Displays navigation links.
- Organizes application modules.
- Displays account options.
- Highlights active routes.
- Supports responsive layouts.

UI Features:
Sidebar navigation
Route highlighting
Account controls

Used By:
Main application layout

==================================================
*/
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Utensils,
  MessageSquare,
  Activity,
  Dumbbell,
  Camera,
  FileText,
  LogOut,
  User,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Dietician", path: "/diet", icon: Utensils },
  { title: "Fitness Chat", path: "/chat", icon: MessageSquare },
  { title: "Habits", path: "/habits", icon: Activity },
  { title: "Workout", path: "/workout", icon: Dumbbell },
  { title: "Webcam", path: "/webcam", icon: Camera },
  { title: "Reports", path: "/reports", icon: FileText },
  { title: "Gym Finder", path: "/gym-finder", icon: MapPin }, // ← reverted from "Nearby Fitness Centers"
];

const sidebarVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const navListVariants = {
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

function NavItem({ path, icon: Icon, title, onNavigate }) {
  return (
    <motion.div variants={navItemVariants}>
      <NavLink
        to={path}
        className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        onClick={onNavigate}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                className="sidebar-active-rail"
                layoutId="active-rail"
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            )}
            <span className="sidebar-link-icon">
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            <span className="sidebar-link-label">{title}</span>
          </>
        )}
      </NavLink>
    </motion.div>
  );
}

export default function Sidebar({ isOpen = false, onClose } = {}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate("/");
  };

  // Mobile drawer: dismiss the sidebar after the user taps a nav link so
  // they land on the new page without the drawer still covering it.
  // No-op on desktop — `sidebar--open` only has a visual effect under the
  // 768px breakpoint (see sidebar.css), so calling this there is harmless.
  const handleNavigate = () => onClose?.();

  return (
    <motion.aside
      className={`sidebar${isOpen ? " sidebar--open" : ""}`}
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="sidebar-header">
        <div className="sidebar-logo-mark" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#6366F1" />
            <path
              d="M8 20 L14 8 L20 20"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M10.5 16 L17.5 16"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="logo-name">IFA</span>
          <span className="logo-tagline">Intelligent Fitness Assistant</span>
        </div>
      </div>

      <div className="sidebar-nav-section">
        <p className="sidebar-section-label">Navigation</p>
        <motion.nav
          className="sidebar-nav"
          variants={navListVariants}
          initial="hidden"
          animate="visible"
        >
          {menuItems.map((item) => (
            <NavItem key={item.path} {...item} onNavigate={handleNavigate} />
          ))}
        </motion.nav>
      </div>

      <div className="sidebar-account">
        <p className="sidebar-section-label">Account</p>
        <motion.nav
          className="sidebar-nav"
          variants={navListVariants}
          initial="hidden"
          animate="visible"
        >
          <NavItem
            path="/profile"
            icon={User}
            title="Profile"
            onNavigate={handleNavigate}
          />
        </motion.nav>

        <div className="sidebar-divider" />

        <motion.button
          className="logout-btn"
          onClick={handleLogout}
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
          type="button"
        >
          <LogOut size={16} strokeWidth={1.8} />
          <span>Log out</span>
        </motion.button>
      </div>
    </motion.aside>
  );
}
