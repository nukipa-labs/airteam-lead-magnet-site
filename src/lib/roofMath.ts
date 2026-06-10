import area from "@turf/area";
import length from "@turf/length";
import type { LatLng, Pitch, RoofSection } from "../types";

/** Roof pitch presets. Multiplier = 1 / cos(angle) converts the flat footprint
 *  (what you see from the satellite) into the true sloped surface area.
 *  `labelKey` resolves to a translated label via i18n. */
export const PITCHES: Pitch[] = [
  { key: "flat", labelKey: "pitch.flat", angleDeg: 0 },
  { key: "low", labelKey: "pitch.low", angleDeg: 15 },
  { key: "medium", labelKey: "pitch.medium", angleDeg: 30 },
  { key: "steep", labelKey: "pitch.steep", angleDeg: 45 },
];

export const SECTION_COLORS = [
  "#23e7a5",
  "#4d65ff",
  "#ff8a23",
  "#e7239b",
  "#23c7e7",
  "#b923e7",
];

export function pitchMultiplier(angleDeg: number): number {
  return 1 / Math.cos((angleDeg * Math.PI) / 180);
}

function toPolygonGeoJSON(latlngs: LatLng[]) {
  // GeoJSON wants [lng, lat] and a closed ring.
  const ring = latlngs.map((p) => [p.lng, p.lat]);
  if (ring.length > 0) ring.push(ring[0]);
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [ring] },
    properties: {},
  };
}

/** Flat footprint area in m² for a traced outline. */
export function footprintArea(latlngs: LatLng[]): number {
  if (latlngs.length < 3) return 0;
  return area(toPolygonGeoJSON(latlngs));
}

/** Perimeter in metres. */
export function perimeter(latlngs: LatLng[]): number {
  if (latlngs.length < 2) return 0;
  const ring = latlngs.map((p) => [p.lng, p.lat]);
  ring.push(ring[0]);
  const line = {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: ring },
    properties: {},
  };
  return length(line, { units: "kilometers" }) * 1000;
}

export type RoofTotals = {
  footprintM2: number;
  surfaceM2: number;
  perimeterM: number;
  sectionCount: number;
};

export function totals(sections: RoofSection[], angleDeg: number): RoofTotals {
  const footprintM2 = sections.reduce((s, r) => s + r.footprintM2, 0);
  return {
    footprintM2,
    surfaceM2: footprintM2 * pitchMultiplier(angleDeg),
    perimeterM: sections.reduce((s, r) => s + r.perimeterM, 0),
    sectionCount: sections.length,
  };
}

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
