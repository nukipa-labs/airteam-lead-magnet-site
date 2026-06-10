import { useEffect, useState } from "react";
import type { CompanyProfile, Pricing } from "../types";

const PRICING_KEY = "airteam_pricing_v2";
const COMPANY_KEY = "airteam_company_v1";

/** Default tiles. Names are seeded from i18n on first run. */
export const DEFAULT_TILE_DEFS = [
  { id: "tile", nameKey: "mat.tile", rate: 145 },
  { id: "metal", nameKey: "mat.metal", rate: 190 },
  { id: "bitumen", nameKey: "mat.bitumen", rate: 120 },
  { id: "slate", nameKey: "mat.slate", rate: 240 },
];

/** Standard optional positions a German Dachdecker typically lists, priced
 *  per m² of roof surface. (2 original + 5 common additions.) */
export const DEFAULT_ADDON_DEFS = [
  { id: "removeOld", nameKey: "addon.removeOld", rate: 25 },
  { id: "scaffold", nameKey: "addon.scaffold", rate: 18 },
  { id: "underlay", nameKey: "addon.underlay", rate: 12 },
  { id: "battens", nameKey: "addon.battens", rate: 15 },
  { id: "insulation", nameKey: "addon.insulation", rate: 55 },
  { id: "flashing", nameKey: "addon.flashing", rate: 20 },
  { id: "gutters", nameKey: "addon.gutters", rate: 14 },
];

/** Addons selected by default on a fresh offer. */
export const DEFAULT_SELECTED_ADDONS = ["removeOld", "scaffold", "underlay"];

export function defaultPricing(t: (k: string) => string): Pricing {
  return {
    tiles: DEFAULT_TILE_DEFS.map((d) => ({
      id: d.id,
      name: t(d.nameKey),
      rate: d.rate,
    })),
    addons: DEFAULT_ADDON_DEFS.map((d) => ({
      id: d.id,
      name: t(d.nameKey),
      rate: d.rate,
    })),
  };
}

export function defaultCompany(): CompanyProfile {
  return {
    name: "",
    street: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    accent: "#23e7a5",
  };
}

/** Project-type multipliers applied on top of per-m² pricing. */
export const SCOPE_FACTORS: Record<string, number> = {
  new: 1,
  repair: 0.55,
  solar: 0.3,
};

export type LineItem = { id: string; name: string; rate: number; amount: number };

export type Estimate = {
  tileName: string;
  tileRate: number;
  coveringAmount: number;
  addonLines: LineItem[];
  subtotal: number;
  scopeFactor: number;
  total: number;
  low: number;
  high: number;
  perM2: number;
};

/** Single source of truth for the price — used by both the live offer UI and the
 *  generated PDF so they never drift apart. */
export function computeEstimate(
  pricing: Pricing,
  opts: { material: string; scope: string; selectedAddons: string[] },
  surfaceM2: number
): Estimate {
  const tile =
    pricing.tiles.find((t) => t.id === opts.material) ?? pricing.tiles[0];
  const tileRate = tile?.rate ?? 0;
  const coveringAmount = surfaceM2 * tileRate;

  const addonLines: LineItem[] = pricing.addons
    .filter((a) => opts.selectedAddons.includes(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      rate: a.rate,
      amount: surfaceM2 * a.rate,
    }));

  const subtotal =
    coveringAmount + addonLines.reduce((s, l) => s + l.amount, 0);
  const scopeFactor = SCOPE_FACTORS[opts.scope] ?? 1;
  const total = subtotal * scopeFactor;
  return {
    tileName: tile?.name ?? "",
    tileRate,
    coveringAmount,
    addonLines,
    subtotal,
    scopeFactor,
    total,
    low: total * 0.85,
    high: total * 1.15,
    perM2: surfaceM2 > 0 ? total / surfaceM2 : 0,
  };
}

/** Editable pricing config persisted to localStorage. Seeds from i18n defaults. */
export function usePricing(t: (k: string) => string) {
  const [pricing, setPricing] = useState<Pricing>(() => {
    try {
      const raw = localStorage.getItem(PRICING_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Pricing;
        if (p?.tiles?.length && p?.addons?.length) return p;
      }
    } catch {
      /* ignore */
    }
    return defaultPricing(t);
  });

  useEffect(() => {
    localStorage.setItem(PRICING_KEY, JSON.stringify(pricing));
  }, [pricing]);

  const reset = () => {
    localStorage.removeItem(PRICING_KEY);
    setPricing(defaultPricing(t));
  };

  return { pricing, setPricing, reset };
}

/** The roofer's company profile (white-labels the PDF), persisted locally. */
export function useCompany() {
  const [company, setCompany] = useState<CompanyProfile>(() => {
    try {
      const raw = localStorage.getItem(COMPANY_KEY);
      if (raw) return { ...defaultCompany(), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return defaultCompany();
  });

  useEffect(() => {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
  }, [company]);

  return { company, setCompany };
}
