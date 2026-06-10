"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "de" | "en";

type Dict = Record<string, string>;

const de: Dict = {
  // header
  "step.search": "Adresse",
  "step.roof": "Dach einzeichnen",
  "step.offer": "Ihr Angebot",
  "nav.demo": "Demo buchen",
  // address search
  "hero.badge": "Kostenloser Dach-Sofortbericht",
  "hero.pre": "Messen Sie Ihr Dach in",
  "hero.accent": "unter einer Minute",
  "hero.sub":
    "Adresse eingeben, Dach auf dem Satellitenbild einzeichnen und sofort die Maße erhalten – dann ein passendes Angebot. Kein Drohnentermin zum Start nötig.",
  "hero.placeholder": "Gebäudeadresse eingeben…",
  "hero.try": "Versuchen Sie „Brandenburger Tor, Berlin“ oder Ihr eigenes Dach.",
  "hero.trust1": "Zentimetergenau",
  "hero.trust2": "90 % schneller als manuell",
  "hero.trust3": "Keine CAD-Kenntnisse nötig",
  "search.error": "Suche momentan nicht möglich.",
  // roof map
  "roof.changeAddress": "Adresse ändern",
  "roof.surface": "Dachfläche",
  "roof.footprint": "Grundfläche",
  "roof.perimeter": "Umfang",
  "roof.sections": "Flächen",
  "roof.surfaceNote":
    "Die Dachfläche berücksichtigt die Dachneigung. Die Grundfläche ist die von oben gesehene flache Fläche.",
  "roof.pitch": "Dachneigung",
  "roof.sectionList": "Dachflächen",
  "roof.clearAll": "Alle löschen",
  "roof.empty": "Noch keine Flächen. Zeichnen Sie Ihre erste Dachfläche ein.",
  "roof.section": "Fläche",
  "roof.footprintShort": "m² Grundfläche",
  "roof.tip":
    "Tipp: Ziehen Sie an einer Ecke zum Feinjustieren. Zeichnen Sie jede Dachfläche (z. B. beide Seiten eines Satteldachs) einzeln ein.",
  "roof.continue": "Weiter zum Angebot →",
  "roof.hintIdlePre": "Klicken Sie auf",
  "roof.hintIdleBtn": "Dachfläche einzeichnen",
  "roof.hintIdlePost": "um Ihr Dach zu umranden",
  "roof.hintDraw": "Jede Dachecke antippen · zum Beenden doppeltippen",
  "roof.cancel": "Abbrechen",
  "roof.trace": "Dachfläche einzeichnen",
  "roof.traceAnother": "Weitere Fläche einzeichnen",
  "roof.fit": "Ansicht anpassen",
  "roof.deleteSection": "Fläche löschen",
  // offer
  "offer.back": "Zurück zum Dach",
  "offer.title": "Sagen Sie uns, was Sie brauchen",
  "offer.sub":
    "Wir haben Ihr Dach vermessen. Wählen Sie ein paar Optionen für ein passendes Angebot.",
  "offer.material": "Material",
  "offer.projectType": "Projektart",
  "offer.options": "Positionen",
  "offer.optionsHint":
    "Wählen Sie die Positionen, die in dieses Angebot aufgenommen werden.",
  "offer.yourDetails": "Ihre Angaben",
  "offer.name": "Vollständiger Name",
  "offer.email": "E-Mail",
  "offer.phone": "Telefon (optional)",
  "offer.postcode": "Postleitzahl",
  "offer.indicative": "Richtangebot",
  "offer.perM2Surface": "≈ {rate}/m² · {area} m² Dachfläche",
  "offer.pitchLabel": "Neigung",
  "offer.cta": "Festpreis-Angebot erhalten",
  "offer.noObligation": "Unverbindlich · Bestätigt per Drohnenscan",
  "offer.downloadPdf": "Angebot als PDF herunterladen",
  "offer.customize": "Eigene Ziegel & Preise",
  "offer.customizeHint":
    "Passen Sie Materialnamen und €/m²-Preise an Ihr Geschäft an. Wird lokal gespeichert.",
  "offer.tileName": "Ziegel / Material",
  "offer.ratePerM2": "€/m²",
  "offer.addTile": "Material hinzufügen",
  "offer.addons": "Positionen & Preise (€/m²)",
  "offer.addonName": "Position",
  "offer.addAddon": "Position hinzufügen",
  "offer.resetPricing": "Auf Standard zurücksetzen",
  "offer.company": "Ihr Unternehmen (Absender des Angebots)",
  "offer.companyHint":
    "Diese Angaben erscheinen als Absender auf dem PDF-Angebot an Ihren Kunden. Wird lokal gespeichert.",
  "offer.companyName": "Firmenname",
  "offer.companyStreet": "Straße & Nr.",
  "offer.companyCity": "PLZ & Ort",
  "offer.companyPhone": "Telefon",
  "offer.companyEmail": "E-Mail",
  "offer.companyWebsite": "Website",
  "offer.companyAccent": "Akzentfarbe",
  "offer.successTitle": "Ihr Angebot ist unterwegs 🎉",
  "offer.successBody":
    "Danke {name} – wir haben Ihr Dachaufmaß für {addr} gespeichert. Wir senden Ihnen ein Festpreis-Angebot per E-Mail an {email} und bestätigen die Maße bei Bedarf mit einem Drohnenscan.",
  "offer.indicativePrice": "Richtpreis",
  "offer.behindLink":
    "Dies ist die Seite, die Sie hinter Ihren Kampagnen-Link setzen – jeder Lead kommt mit bereits vermessenem Dach.",
  // materials (default names)
  "mat.tile": "Ton-/Betondachziegel",
  "mat.metal": "Stehfalz-Metalldach",
  "mat.bitumen": "Flachdach / Bitumenbahn",
  "mat.slate": "Naturschiefer",
  // addon positions (default names)
  "addon.removeOld": "Abriss & Entsorgung der Alteindeckung",
  "addon.scaffold": "Gerüststellung",
  "addon.underlay": "Unterspannbahn / Unterdeckbahn",
  "addon.battens": "Konter- & Dachlattung",
  "addon.insulation": "Aufdach-Dämmung",
  "addon.flashing": "Spenglerarbeiten (Anschlüsse, Bleche)",
  "addon.gutters": "Dachrinne & Fallrohre",
  // scopes
  "scope.new": "Komplette Neueindeckung",
  "scope.repair": "Reparatur / Teilfläche",
  "scope.solar": "Solar-Aufmaß",
  // pitch
  "pitch.flat": "Flach (0°)",
  "pitch.low": "Flach geneigt (15°)",
  "pitch.medium": "Standard (30°)",
  "pitch.steep": "Steil (45°)",
  // pdf
  "pdf.quote": "ANGEBOT",
  "pdf.for": "Für",
  "pdf.from": "Von",
  "pdf.date": "Datum",
  "pdf.quoteNo": "Angebotsnr.",
  "pdf.object": "Objektadresse",
  "pdf.measurement": "Dachaufmaß",
  "pdf.yourRoof": "Ihr Dach (Schema)",
  "pdf.position": "Position",
  "pdf.qty": "Menge",
  "pdf.unit": "Einzelpreis",
  "pdf.amount": "Betrag",
  "pdf.baseCovering": "Dacheindeckung – {material}",
  "pdf.subtotal": "Zwischensumme",
  "pdf.scopeFactor": "Projektfaktor ({scope})",
  "pdf.total": "Gesamtsumme (Richtwert)",
  "pdf.vatNote": "Alle Preise zzgl. gesetzl. MwSt.",
  "pdf.range": "Erwartete Bandbreite: {low} – {high}",
  "pdf.disclaimer":
    "Richtangebot auf Basis eines Satelliten-Aufmaßes (Grundfläche + Neigung). Die endgültigen Maße werden mit einem Drohnenscan zentimetergenau bestätigt. Gültig 30 Tage.",
  "pdf.poweredBy": "Angebot erstellt mit airteam.ai",
  "pdf.companyFallback": "Ihr Unternehmen",
  "pdf.filename": "Angebot",
};

const en: Dict = {
  "step.search": "Address",
  "step.roof": "Trace roof",
  "step.offer": "Your offer",
  "nav.demo": "Book a demo",
  "hero.badge": "Free instant roof report",
  "hero.pre": "Measure your roof in",
  "hero.accent": "under a minute",
  "hero.sub":
    "Type your address, trace your roof on the satellite view, and get instant measurements — then a tailored offer. No drone visit required to start.",
  "hero.placeholder": "Enter a building address…",
  "hero.try": "Try “Brandenburger Tor, Berlin” or your own roof.",
  "hero.trust1": "Centimetre-level accuracy",
  "hero.trust2": "90% faster than manual",
  "hero.trust3": "No CAD skills needed",
  "search.error": "Couldn't search right now.",
  "roof.changeAddress": "Change address",
  "roof.surface": "Roof surface",
  "roof.footprint": "Footprint",
  "roof.perimeter": "Perimeter",
  "roof.sections": "Sections",
  "roof.surfaceNote":
    "Surface area accounts for roof pitch. Footprint is the flat area seen from above.",
  "roof.pitch": "Roof pitch",
  "roof.sectionList": "Roof sections",
  "roof.clearAll": "Clear all",
  "roof.empty": "No sections yet. Trace your first roof plane on the map.",
  "roof.section": "Section",
  "roof.footprintShort": "m² footprint",
  "roof.tip":
    "Tip: drag any corner to fine-tune. Trace each roof plane (e.g. both sides of a gable) as its own section.",
  "roof.continue": "Continue to your offer →",
  "roof.hintIdlePre": "Click",
  "roof.hintIdleBtn": "Trace a roof section",
  "roof.hintIdlePost": "to outline your roof",
  "roof.hintDraw": "Tap each roof corner · double-tap to finish",
  "roof.cancel": "Cancel",
  "roof.trace": "Trace a roof section",
  "roof.traceAnother": "Trace another section",
  "roof.fit": "Fit view",
  "roof.deleteSection": "Delete section",
  "offer.back": "Back to roof",
  "offer.title": "Tell us what you need",
  "offer.sub":
    "We've measured your roof. Pick a few options for a tailored offer.",
  "offer.material": "Material",
  "offer.projectType": "Project type",
  "offer.options": "Positions",
  "offer.optionsHint": "Pick the positions to include in this offer.",
  "offer.yourDetails": "Your details",
  "offer.name": "Full name",
  "offer.email": "Email",
  "offer.phone": "Phone (optional)",
  "offer.postcode": "Postcode",
  "offer.indicative": "Indicative offer",
  "offer.perM2Surface": "≈ {rate}/m² · {area} m² roof surface",
  "offer.pitchLabel": "Pitch",
  "offer.cta": "Get my fixed-price offer",
  "offer.noObligation": "No obligation · Confirmed by drone scan",
  "offer.downloadPdf": "Download offer as PDF",
  "offer.customize": "Your own tiles & prices",
  "offer.customizeHint":
    "Adjust material names and €/m² prices to match your business. Saved locally.",
  "offer.tileName": "Tile / material",
  "offer.ratePerM2": "€/m²",
  "offer.addTile": "Add material",
  "offer.addons": "Positions & prices (€/m²)",
  "offer.addonName": "Position",
  "offer.addAddon": "Add position",
  "offer.resetPricing": "Reset to defaults",
  "offer.company": "Your company (offer sender)",
  "offer.companyHint":
    "These details appear as the sender on the PDF offer to your customer. Saved locally.",
  "offer.companyName": "Company name",
  "offer.companyStreet": "Street & no.",
  "offer.companyCity": "Postcode & city",
  "offer.companyPhone": "Phone",
  "offer.companyEmail": "Email",
  "offer.companyWebsite": "Website",
  "offer.companyAccent": "Accent colour",
  "offer.successTitle": "Your offer is on its way 🎉",
  "offer.successBody":
    "Thanks {name} — we've saved your roof measurement for {addr}. We'll email a fixed-price offer to {email} and confirm the dimensions with a drone scan if needed.",
  "offer.indicativePrice": "Indicative price",
  "offer.behindLink":
    "This is the page you'd put behind your campaign link — every lead arrives with a measured roof already attached.",
  "mat.tile": "Clay / concrete tiles",
  "mat.metal": "Standing-seam metal",
  "mat.bitumen": "Flat / bitumen membrane",
  "mat.slate": "Natural slate",
  "addon.removeOld": "Tear-off & disposal of old covering",
  "addon.scaffold": "Scaffolding",
  "addon.underlay": "Underlay membrane",
  "addon.battens": "Counter & roof battens",
  "addon.insulation": "Above-rafter insulation",
  "addon.flashing": "Flashing / sheet-metal work",
  "addon.gutters": "Gutters & downpipes",
  "scope.new": "Full re-roof",
  "scope.repair": "Repair / partial",
  "scope.solar": "Solar-ready survey",
  "pitch.flat": "Flat (0°)",
  "pitch.low": "Low slope (15°)",
  "pitch.medium": "Standard (30°)",
  "pitch.steep": "Steep (45°)",
  "pdf.quote": "QUOTE",
  "pdf.for": "For",
  "pdf.from": "From",
  "pdf.date": "Date",
  "pdf.quoteNo": "Quote no.",
  "pdf.object": "Property address",
  "pdf.measurement": "Roof measurement",
  "pdf.yourRoof": "Your roof (schematic)",
  "pdf.position": "Item",
  "pdf.qty": "Qty",
  "pdf.unit": "Unit price",
  "pdf.amount": "Amount",
  "pdf.baseCovering": "Roof covering – {material}",
  "pdf.subtotal": "Subtotal",
  "pdf.scopeFactor": "Project factor ({scope})",
  "pdf.total": "Total (indicative)",
  "pdf.vatNote": "All prices excl. statutory VAT.",
  "pdf.range": "Expected range: {low} – {high}",
  "pdf.disclaimer":
    "Indicative offer based on a satellite measurement (footprint + pitch). Final dimensions are confirmed to the centimetre with a drone scan. Valid for 30 days.",
  "pdf.poweredBy": "Offer created with airteam.ai",
  "pdf.companyFallback": "Your company",
  "pdf.filename": "Offer",
};

const DICTS: Record<Lang, Dict> = { de, en };

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("airteam_lang");
    return saved === "en" || saved === "de" ? saved : "de";
  });
  useEffect(() => {
    localStorage.setItem("airteam_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string, vars?: Record<string, string | number>) =>
    interpolate(DICTS[lang][key] ?? DICTS.en[key] ?? key, vars);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used within I18nProvider");
  return v;
}