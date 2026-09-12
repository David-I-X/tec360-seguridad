/**
 * Tec360 — Google Maps Custom JSON Styles
 * Native vector map styling for Light (Silver Minimalist) and Dark (Telematics) modes.
 */

// ─── LIGHT THEME: Silver Minimalist (Matches Reference Image) ───
export const MAP_STYLE_LIGHT = [
  { featureType: "all", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "simplified" }] },
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#525252" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#424242" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f0f0f0" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#333333" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
];

// ─── DARK THEME: Tec360 Sci-Fi Telematics ───
export const MAP_STYLE_DARK = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "simplified" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#090d1a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#151c2e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8b8fa3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#312e81" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e1b4b" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#a5b4fc" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
];
