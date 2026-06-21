// src/pages/GymFinder.jsx
/*
==================================================
AI Gym & Fitness Assistant

File: GymFinder.jsx

Purpose:
Helps users discover nearby gyms using
their current location.

Functionality:
- Uses browser geolocation.
- Uses Profile location fallback.
- Searches nearby gyms.
- Supports radius selection.
- Displays gym details.
- Displays directions.
- Displays search states.
- Supports responsive layouts.

Responsibilities:
Location handling
Gym discovery
Search management
Results visualization

Used By:
Gym Finder page

==================================================
*/
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { gymFinderService } from "../services/gymFinderService";
import DashboardLayout from "../layouts/DashboardLayout";
import "../styles/gymfinder.css";
import {
  MapPin,
  Phone,
  Globe,
  Navigation,
  Search,
  Dumbbell,
  AlertCircle,
  Loader2,
  ExternalLink,
  LocateFixed,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_RADIUS = 1;
const MAX_RADIUS = 10;
const DEFAULT_RADIUS = 5;

// ── LocationControl ───────────────────────────────────────────────────────────

function LocationControl({ status, sourceLabel, onUseLocation }) {
  const isReady = status === "ready";
  const isLocating = status === "locating";

  return (
    <div className="gf-field">
      <span className="gf-field-label">
        <LocateFixed size={13} />
        Location
      </span>
      <button
        className={`gf-location-btn${isReady ? " gf-location-btn--ready" : ""}`}
        onClick={onUseLocation}
        disabled={isLocating}
        type="button"
      >
        {isLocating ? (
          <Loader2 size={15} className="gf-spin" />
        ) : isReady ? (
          <CheckCircle2 size={15} />
        ) : (
          <LocateFixed size={15} />
        )}
        {isLocating
          ? "Locating…"
          : isReady
            ? sourceLabel
            : "Use Current Location"}
      </button>
    </div>
  );
}

// ── RadiusSlider ──────────────────────────────────────────────────────────────

function RadiusSlider({ radiusKm, onChange, disabled }) {
  return (
    <div className="gf-field">
      <span className="gf-field-label">
        <SlidersHorizontal size={13} />
        Radius — {radiusKm} km
      </span>
      <input
        type="range"
        className="gf-radius-slider"
        min={MIN_RADIUS}
        max={MAX_RADIUS}
        step={1}
        value={radiusKm}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="gf-radius-ticks">
        <span>{MIN_RADIUS} km</span>
        <span>{MAX_RADIUS} km</span>
      </div>
    </div>
  );
}

// ── GymCard ───────────────────────────────────────────────────────────────────

function GymCard({ gym, index }) {
  // Prefer name + address as the Google Maps search query — gives users a
  // proper place result page rather than a raw coordinate pin.
  const googleUrl = gymFinderService.getGoogleMapsUrl(
    gym.lat,
    gym.lng,
    gym.name,
    gym.address,
  );

  return (
    <motion.article
      className="gf-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index * 0.05, 0.3),
        ease: "easeInOut",
      }}
    >
      <div className="gf-card-body">
        {/* Name + icon */}
        <div className="gf-card-header">
          <span className="gf-card-icon">
            <Dumbbell size={15} />
          </span>
          <h3 className="gf-card-name">{gym.name}</h3>
        </div>

        {/* Distance */}
        <span className="gf-distance-tag">
          <MapPin size={12} />
          {gym.distance_km} km away
        </span>

        {/* Address / phone / website */}
        {(gym.address || gym.phone || gym.website) && (
          <div className="gf-card-meta">
            {gym.address && (
              <div className="gf-card-meta-row">
                <MapPin size={13} />
                <span>{gym.address}</span>
              </div>
            )}

            {gym.phone && (
              <div className="gf-card-meta-row">
                <Phone size={13} />
                <a href={`tel:${gym.phone}`} className="gf-link">
                  {gym.phone}
                </a>
              </div>
            )}

            {gym.website && (
              <div className="gf-card-meta-row">
                <Globe size={13} />
                <a
                  href={gym.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gf-link"
                >
                  Website
                  <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Directions */}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gf-directions-btn"
        >
          <Navigation size={13} />
          Directions
        </a>
      </div>
    </motion.article>
  );
}

// ── State views ───────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="gf-state">
      <Loader2 size={32} className="gf-spin" />
      <p>Finding gyms near you…</p>
      <span>Querying OpenStreetMap — this may take a moment.</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="gf-state">
      <Dumbbell size={32} />
      <p>No gyms found in this area.</p>
      <span>Try increasing the search radius.</span>
    </div>
  );
}

function PromptState({ hasLocation }) {
  return (
    <div className="gf-state">
      <Dumbbell size={32} />
      <p>
        {hasLocation
          ? "Adjust the radius and click Find Gyms."
          : "Start by sharing your current location above."}
      </p>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="gf-error">
      <AlertCircle size={15} />
      <span>{message}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymFinder() {
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS);
  const [location, setLocation] = useState(null); // { lat, lng }
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | locating | ready
  const [locationSourceLabel, setLocationSourceLabel] = useState("");
  const [locationError, setLocationError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [gyms, setGyms] = useState([]);

  // ── Location ──────────────────────────────────────────────────────────────

  const handleUseLocation = useCallback(() => {
    setLocationError(null);
    setLocationStatus("locating");

    async function fallbackToProfile() {
      try {
        const data = await gymFinderService.getProfileLocation();
        if (data.has_location && data.lat != null) {
          setLocation({ lat: data.lat, lng: data.lng });
          setLocationSourceLabel(`Profile city — ${data.city}`);
          setLocationStatus("ready");
        } else {
          setLocationStatus("idle");
          setLocationError(
            "Location unavailable. Allow browser location access or add a city to your Profile.",
          );
        }
      } catch (_) {
        setLocationStatus("idle");
        setLocationError(
          "Location unavailable. Allow browser location access or add a city to your Profile.",
        );
      }
    }

    if (!navigator.geolocation) {
      fallbackToProfile();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationSourceLabel("Current location");
        setLocationStatus("ready");
      },
      () => fallbackToProfile(),
      { timeout: 10000 },
    );
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!location) return;

    setError(null);
    setLoading(true);
    setSearched(true);

    try {
      const result = await gymFinderService.findGyms({
        radiusKm,
        lat: location.lat,
        lng: location.lng,
      });
      setGyms(result.gyms || []);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setGyms([]);
    } finally {
      setLoading(false);
    }
  }, [radiusKm, location]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="gf-page">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <motion.section
          className="gf-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <div className="gf-hero-accent gf-hero-accent--a" />
          <div className="gf-hero-accent gf-hero-accent--b" />

          <div className="gf-hero-content">
            <div className="gf-hero-text">
              <span className="gf-hero-eyebrow">
                <MapPin size={14} />
                OpenStreetMap
              </span>

              <h1 className="gf-hero-title">Gym Finder</h1>

              <p className="gf-hero-subtitle">
                Discover nearby gyms around your current location.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <motion.div
          className="gf-controls-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeInOut" }}
        >
          <div className="gf-controls-header">
            <h2>Search Settings</h2>
            <p>Share your location, set a radius, then find gyms.</p>
          </div>

          <div className="gf-controls-row">
            <LocationControl
              status={locationStatus}
              sourceLabel={locationSourceLabel}
              onUseLocation={handleUseLocation}
            />

            <RadiusSlider
              radiusKm={radiusKm}
              onChange={setRadiusKm}
              disabled={loading}
            />

            <button
              className="gf-search-btn"
              onClick={handleSearch}
              disabled={loading || locationStatus !== "ready"}
              type="button"
            >
              {loading ? (
                <Loader2 size={15} className="gf-spin" />
              ) : (
                <Search size={15} />
              )}
              {loading ? "Searching…" : "Find Gyms"}
            </button>
          </div>
        </motion.div>

        {/* ── Errors ────────────────────────────────────────────────────────── */}
        {locationError && <ErrorBanner message={locationError} />}
        {error && <ErrorBanner message={error} />}

        {/* ── Results ───────────────────────────────────────────────────────── */}
        {loading && (
          <div className="gf-results-card">
            <LoadingState />
          </div>
        )}

        {!loading && searched && (
          <motion.div
            className="gf-results-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="gf-results-header">
              <div>
                <h2>Nearby Gyms</h2>
                <p>Sorted by distance, closest first.</p>
              </div>
              {gyms.length > 0 && (
                <span className="gf-results-count-badge">
                  {gyms.length} found
                </span>
              )}
            </div>

            {gyms.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="gf-grid">
                {gyms.map((gym, idx) => (
                  <GymCard key={gym.osm_id} gym={gym} index={idx} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!loading && !searched && (
          <div className="gf-results-card">
            <PromptState hasLocation={locationStatus === "ready"} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
