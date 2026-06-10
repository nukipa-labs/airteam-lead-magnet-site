# Airteam — Instant Roof Measurement (Nukipa site)

A Nukipa-managed lead-magnet site for **Airteam** (drone + AI 3D building
measurement; audience = roofers, solar installers, tradespeople).

A visitor enters an address, sees a satellite view, **traces their roof** on it,
gets instant measurements (footprint + pitch-adjusted surface area), specifies the
job, and gets a tailored offer — downloadable as a **styled PDF**. The lead +
measured-roof context is captured into the Nukipa CRM.

Bilingual **German (default) / English** via a header toggle.

## Stack

- **Next.js 15** (App Router) + React 19 + Tailwind v4 — the Nukipa platform contract.
- **Leaflet** + **Esri World Imagery** satellite tiles (no API key).
- **OpenStreetMap Nominatim** geocoding (no API key).
- **Leaflet-Geoman** for roof drawing (custom UI; default toolbar hidden).
- **Turf.js** for geodesic area/perimeter; roof surface = footprint × 1/cos(pitch).
- **jsPDF** (lazy-loaded) for the branded offer PDF, incl. a vector roof schematic.

The whole roof tool is client-only — `src/app/page.tsx` loads
`src/components/LeadMagnetApp.tsx` via `next/dynamic({ ssr: false })`, so nothing
map-related runs during SSR.

## Nukipa integration (platform contract — keep)

- `src/lib/nukipa.ts` — SDK client factory.
- `src/middleware.ts` — fire-and-forget page-view analytics.
- `src/app/layout.tsx` — `generateMetadata` (Google Search Console token) +
  `<NukipaFeedback />` widget mount.
- `src/lib/submitLead.ts` — posts the lead to the Nukipa CMS form
  (`roof-offer` slug) → lands in the CRM. Tenant is resolved by Host when served
  on the tenant's Nukipa domain.

## Local dev

```bash
cp .env.example .env.local     # set NUKIPA_GATEWAY_URL + NEXT_PUBLIC_NUKIPA_GATEWAY_URL
npm install
npm run dev                    # http://localhost:3000
npm run build                  # production build
```

`NUKIPA_GATEWAY_URL` is required (the SDK throws at startup if unset). The Nukipa
deployer injects the correct gateway in production.

## Lead form

The `roof-offer` form must exist on the tenant (created at deploy time via
`POST /api/cms/forms`). Submissions feed `crm_list_contacts`. The submitted
payload includes name/email/phone/postcode plus the measured roof context
(address, surface m², material, pitch, indicative price range).
