"use client";

import dynamic from "next/dynamic";

// The roof tool is entirely client-side (Leaflet, Geoman, jsPDF, localStorage).
// Load it browser-only so nothing map-related runs during SSR.
const LeadMagnetApp = dynamic(() => import("@/components/LeadMagnetApp"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-[#23e7a5]" />
    </div>
  ),
});

export default function HomePage() {
  return <LeadMagnetApp />;
}
