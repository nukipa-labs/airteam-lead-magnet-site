"use client";

import { useState } from "react";
import { Header } from "./Header";
import { AddressSearch } from "./AddressSearch";
import { RoofMap } from "./RoofMap";
import { OfferStep } from "./OfferStep";
import { I18nProvider } from "../i18n";
import type { AddressResult, RoofSection, Step } from "../types";

// Leaflet + Geoman styles. This whole subtree is loaded client-only
// (page.tsx imports it via next/dynamic with ssr:false), so importing
// these here keeps them out of the server bundle.
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

function Wizard() {
  const [step, setStep] = useState<Step>("search");
  const [address, setAddress] = useState<AddressResult | null>(null);
  const [sections, setSections] = useState<RoofSection[]>([]);
  const [pitchKey, setPitchKey] = useState("medium");

  return (
    <div className="flex min-h-screen flex-col">
      <Header step={step} />

      {step === "search" && (
        <AddressSearch
          onSelect={(a) => {
            setAddress(a);
            setStep("roof");
          }}
        />
      )}

      {step === "roof" && address && (
        <RoofMap
          address={address}
          sections={sections}
          setSections={setSections}
          pitchKey={pitchKey}
          setPitchKey={setPitchKey}
          onBack={() => setStep("search")}
          onContinue={() => setStep("offer")}
        />
      )}

      {step === "offer" && address && (
        <OfferStep
          address={address}
          sections={sections}
          pitchKey={pitchKey}
          onBack={() => setStep("roof")}
        />
      )}
    </div>
  );
}

export default function LeadMagnetApp() {
  return (
    <I18nProvider>
      <Wizard />
    </I18nProvider>
  );
}
