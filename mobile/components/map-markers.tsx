/**
 * Tec360 — Map Markers Entry Point
 * Re-exports new modern map markers from the map module.
 */
export * from './map/map-markers';

// Backward compatibility alias:
import { OriginHaloMarker, DestinationSquircleMarker } from './map/map-markers';
export const TechnicianPinMarker = OriginHaloMarker;
export const MyLocationMarker = OriginHaloMarker;
