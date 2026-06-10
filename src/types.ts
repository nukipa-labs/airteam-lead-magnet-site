export type LatLng = { lat: number; lng: number };

export type AddressResult = {
  label: string;
  lat: number;
  lng: number;
};

/** A single traced roof plane / section. */
export type RoofSection = {
  id: string;
  /** Display name, e.g. "Section 1". */
  name: string;
  /** Outline vertices in [lat, lng]. */
  latlngs: LatLng[];
  /** Flat (footprint) area in m², as seen from above. */
  footprintM2: number;
  /** Perimeter in metres. */
  perimeterM: number;
  /** Hex color used to render this section. */
  color: string;
};

/** Roof pitch presets — multiplier converts footprint → actual sloped area. */
export type Pitch = {
  key: string;
  /** i18n key resolving to the display label. */
  labelKey: string;
  angleDeg: number;
};

/** A configurable tile/material option with a custom €/m² rate. */
export type Tile = {
  id: string;
  name: string;
  rate: number;
};

/** Business-editable pricing config (persisted to localStorage). */
export type Pricing = {
  tiles: Tile[];
  removeOldRate: number;
  insulationRate: number;
};

export type OfferSpec = {
  pitchKey: string;
  material: string;
  scope: string;
  removeOld: boolean;
  insulation: boolean;
  postcode: string;
  name: string;
  email: string;
  phone: string;
};

export type Step = "search" | "roof" | "offer";
