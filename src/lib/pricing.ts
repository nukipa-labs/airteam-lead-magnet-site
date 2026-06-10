import { useEffect, useState } from "react";
import type { Pricing } from "../types";

const KEY = "airteam_pricing_v1";

/** Default tiles. Names are seeded from i18n on first run (see defaultPricing). */
export const DEFAULT_TILE_DEFS = [
  { id: "tile", nameKey: "mat.tile", rate: 145 },
  { id: "metal", nameKey: "mat.metal", rate: 190 },
  { id: "bitumen", nameKey: "mat.bitumen", rate: 120 },
  { id: "slate", nameKey: "mat.slate", rate: 240 },
];

export function defaultPricing(t: (k: string) => string): Pricing {
  return {
    tiles: DEFAULT_TILE_DEFS.map((d) => ({
      id: d.id,
      name: t(d.nameKey),
      rate: d.rate,
    })),
    removeOldRate: 25,
    insulationRate: 55,
  };
}

/** Project-type multipliers applied on top of per-m² pricing. */
export const SCOPE_FACTORS: Record<string, number> = {
  new: 1,
  repair: 0.55,
  solar: 0.3,
};

export type Estimate = {
  tileName: string;
  tileRate: number;
  coveringAmount: number;
  removeOldAmount: number;
  insulationAmount: number;
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
  opts: { material: string; scope: string; removeOld: boolean; insulation: boolean },
  surfaceM2: number
): Estimate {
  const tile =
    pricing.tiles.find((t) => t.id === opts.material) ?? pricing.tiles[0];
  const tileRate = tile?.rate ?? 0;
  const coveringAmount = surfaceM2 * tileRate;
  const removeOldAmount = opts.removeOld ? surfaceM2 * pricing.removeOldRate : 0;
  const insulationAmount = opts.insulation
    ? surfaceM2 * pricing.insulationRate
    : 0;
  const subtotal = coveringAmount + removeOldAmount + insulationAmount;
  const scopeFactor = SCOPE_FACTORS[opts.scope] ?? 1;
  const total = subtotal * scopeFactor;
  return {
    tileName: tile?.name ?? "",
    tileRate,
    coveringAmount,
    removeOldAmount,
    insulationAmount,
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
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as Pricing;
    } catch {
      /* ignore */
    }
    return defaultPricing(t);
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(pricing));
  }, [pricing]);

  const reset = () => {
    localStorage.removeItem(KEY);
    setPricing(defaultPricing(t));
  };

  return { pricing, setPricing, reset };
}
