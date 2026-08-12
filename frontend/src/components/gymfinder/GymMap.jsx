// src/components/gymfinder/GymMap.jsx
/*
==================================================
IFA — Intelligent Fitness Assistant

File: GymMap.jsx

Purpose:
Renders an interactive OpenStreetMap view of the user's
location and nearby gyms found by the existing Gym
Finder search (GET /gym-finder/gyms) — no geocoding
happens here, every coordinate is already provided by
the backend.

Functionality:
- Centers on the user's resolved location.
- One marker for the user, one per gym with valid
  numeric coordinates (invalid ones are silently
  skipped).
- Gym popups reuse the existing Google Maps deep-link
  helper (gymFinderService.getGoogleMapsUrl) — no new
  directions logic.
- Custom lightweight SVG markers (no external icon image
  assets) — avoids Leaflet's well-known default-marker
  path breakage under Vite bundling, and matches the
  app's existing icon language instead of Leaflet's blue
  pin.

No API key, no paid map service — OpenStreetMap tiles
only, consistent with gym_service.py's Nominatim/Overpass
architecture.

Used By:
Gym Finder page

==================================================
*/
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { gymFinderService } from "../../services/gymFinderService";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function pinIcon(color) {
  return L.divIcon({
    className: "gf-map-pin",
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.82 20.18 0 13 0z" fill="${color}"/>
      <circle cx="13" cy="13" r="5.5" fill="#ffffff"/>
    </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

const USER_ICON = pinIcon("#10B981");
const GYM_ICON = pinIcon("#6366F1");

function isValidCoord(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export default function GymMap({ userLocation, gyms = [] }) {
  if (!isValidCoord(userLocation?.lat, userLocation?.lng)) {
    return null;
  }

  const validGyms = gyms.filter((gym) => isValidCoord(gym.lat, gym.lng));

  return (
    <div className="gf-map-wrapper">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

        <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
          <Popup>You are here</Popup>
        </Marker>

        {validGyms.map((gym) => (
          <Marker key={gym.osm_id} position={[gym.lat, gym.lng]} icon={GYM_ICON}>
            <Popup>
              <div className="gf-map-popup">
                <strong>{gym.name}</strong>
                <span>{gym.distance_km} km away</span>
                {gym.address && <span>{gym.address}</span>}
                <a
                  href={gymFinderService.getGoogleMapsUrl(
                    gym.lat,
                    gym.lng,
                    gym.name,
                    gym.address,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
