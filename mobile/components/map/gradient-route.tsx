import React, { useMemo } from 'react';
import { Polyline } from 'react-native-maps';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface GradientRouteProps {
  coordinates: RouteCoordinate[];
  isDark?: boolean;
  strokeWidth?: number;
}

/**
 * GradientRoute
 * Renders a smooth multi-tone gradient route with depth shadow.
 * Transition: Dark Charcoal/Espresso -> Vibrant Amber/Copper -> Royal Violet/Cobalt Blue
 * Exactly matching the user reference image.
 */
export function GradientRoute({
  coordinates,
  isDark = false,
  strokeWidth = 6,
}: GradientRouteProps) {
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  // Color schemes for Light and Dark modes
  const colors = useMemo(() => {
    if (isDark) {
      return {
        shadow: 'rgba(0, 0, 0, 0.55)',
        seg1: '#334155', // Slate dark
        seg2: '#c2410c', // Burnt amber
        seg3: '#f97316', // Orange
        seg4: '#8b5cf6', // Electric Purple
        seg5: '#3b82f6', // Vivid Blue
      };
    }
    // Light Mode (Matches reference screenshot)
    return {
      shadow: 'rgba(0, 0, 0, 0.10)',
      seg1: '#18181b', // Dark charcoal/espresso
      seg2: '#9a3412', // Rich rustic copper
      seg3: '#ea580c', // Radiant amber
      seg4: '#6366f1', // Royal indigo
      seg5: '#3b82f6', // Cobalt blue
    };
  }, [isDark]);

  // If few points, render single high-contrast polyline with underlay shadow
  if (coordinates.length <= 4) {
    return (
      <>
        {/* Soft shadow underlay */}
        <Polyline
          coordinates={coordinates}
          strokeColor={colors.shadow}
          strokeWidth={strokeWidth + 3}
          lineCap="round"
          lineJoin="round"
          zIndex={1}
        />
        {/* Main path */}
        <Polyline
          coordinates={coordinates}
          strokeColor={colors.seg3}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          zIndex={2}
        />
      </>
    );
  }

  // Divide route into 4 overlapping segments for a smooth, continuous gradient transition
  const total = coordinates.length;
  const p1 = Math.floor(total * 0.25);
  const p2 = Math.floor(total * 0.50);
  const p3 = Math.floor(total * 0.75);

  const segment1 = coordinates.slice(0, p1 + 1);
  const segment2 = coordinates.slice(p1, p2 + 1);
  const segment3 = coordinates.slice(p2, p3 + 1);
  const segment4 = coordinates.slice(p3, total);

  return (
    <>
      {/* ── 1. AMBIENT SHADOW UNDERLAY (Entire Path) ── */}
      <Polyline
        coordinates={coordinates}
        strokeColor={colors.shadow}
        strokeWidth={strokeWidth + 4}
        lineCap="round"
        lineJoin="round"
        zIndex={1}
      />

      {/* ── 2. MULTI-TONE GRADIENT SEGMENTS ── */}
      {/* Segment 1: Origin departure (Dark Charcoal / Espresso) */}
      <Polyline
        coordinates={segment1}
        strokeColor={colors.seg1}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        zIndex={2}
      />

      {/* Segment 2: Mid-way curve 1 (Rich Copper / Amber) */}
      <Polyline
        coordinates={segment2}
        strokeColor={colors.seg2}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        zIndex={3}
      />

      {/* Segment 3: Mid-way curve 2 (Vibrant Amber / Indigo) */}
      <Polyline
        coordinates={segment3}
        strokeColor={colors.seg3}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        zIndex={4}
      />

      {/* Segment 4: Destination arrival (Royal Violet / Cobalt Blue) */}
      <Polyline
        coordinates={segment4}
        strokeColor={colors.seg5}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        zIndex={5}
      />
    </>
  );
}
