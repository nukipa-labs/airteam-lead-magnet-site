import type { AddressResult } from "../types";

/**
 * Free, no-key forward geocoding via OpenStreetMap Nominatim.
 * For a production lead magnet you'd swap this for Google/Mapbox and add
 * server-side rate limiting — Nominatim asks for <=1 req/sec and a real UA.
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    signal,
    headers: { "Accept-Language": "en,de" },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

  const data: any[] = await res.json();
  return data.map((d) => ({
    label: d.display_name as string,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}
