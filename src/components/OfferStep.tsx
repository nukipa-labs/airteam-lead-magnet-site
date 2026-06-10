"use client";

import { useEffect, useMemo, useState } from "react";
import { PITCHES, totals, fmt } from "../lib/roofMath";
import {
  usePricing,
  useCompany,
  computeEstimate,
  DEFAULT_SELECTED_ADDONS,
} from "../lib/pricing";
import { generateOfferPdf } from "../lib/offerPdf";
import { submitLead } from "../lib/submitLead";
import { useI18n } from "../i18n";
import type {
  AddressResult,
  CompanyProfile,
  OfferSpec,
  Pricing,
  RoofSection,
} from "../types";

const SCOPES = [
  { key: "new", labelKey: "scope.new" },
  { key: "repair", labelKey: "scope.repair" },
  { key: "solar", labelKey: "scope.solar" },
];

type Props = {
  address: AddressResult;
  sections: RoofSection[];
  pitchKey: string;
  onBack: () => void;
};

export function OfferStep({ address, sections, pitchKey, onBack }: Props) {
  const { t, lang } = useI18n();
  const { pricing, setPricing, reset } = usePricing(t);
  const { company, setCompany } = useCompany();
  const pitch = PITCHES.find((p) => p.key === pitchKey) ?? PITCHES[2];
  const tot = totals(sections, pitch.angleDeg);

  const [spec, setSpec] = useState<OfferSpec>({
    pitchKey,
    material: pricing.tiles[0]?.id ?? "tile",
    scope: "new",
    selectedAddons: DEFAULT_SELECTED_ADDONS,
    postcode: "",
    name: "",
    email: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  // Lead has been saved to the Nukipa CRM at least once this session.
  const [leadCaptured, setLeadCaptured] = useState(false);
  // Email-capture gate shown before the PDF download.
  const [gateOpen, setGateOpen] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  // Keep the selected material valid if it gets removed in the editor.
  useEffect(() => {
    if (!pricing.tiles.some((tl) => tl.id === spec.material)) {
      setSpec((s) => ({ ...s, material: pricing.tiles[0]?.id ?? "" }));
    }
  }, [pricing.tiles, spec.material]);

  const estimate = useMemo(
    () =>
      computeEstimate(
        pricing,
        {
          material: spec.material,
          scope: spec.scope,
          selectedAddons: spec.selectedAddons,
        },
        tot.surfaceM2
      ),
    [pricing, spec, tot.surfaceM2]
  );

  const money = (n: number) =>
    new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const update = (patch: Partial<OfferSpec>) =>
    setSpec((s) => ({ ...s, ...patch }));

  const toggleAddon = (id: string) =>
    setSpec((s) => ({
      ...s,
      selectedAddons: s.selectedAddons.includes(id)
        ? s.selectedAddons.filter((a) => a !== id)
        : [...s.selectedAddons, id],
    }));

  // The lead payload (measured-roof context + the captured email) sent to the
  // Nukipa CMS form, which lands in the CRM.
  const leadValues = (email: string) => ({
    name: spec.name,
    email,
    phone: spec.phone,
    postcode: spec.postcode,
    address: address.label,
    material: estimate.tileName,
    scope: spec.scope,
    pitch: t(pitch.labelKey),
    options: estimate.addonLines.map((l) => l.name).join(", "),
    company: company.name,
    roof_surface_m2: Math.round(tot.surfaceM2),
    footprint_m2: Math.round(tot.footprintM2),
    sections: tot.sectionCount,
    price_low: Math.round(estimate.low),
    price_high: Math.round(estimate.high),
  });

  // Save the lead to the CRM exactly once per session (deduped via leadCaptured).
  async function captureLead(email: string) {
    if (leadCaptured) return;
    await submitLead(leadValues(email));
    setLeadCaptured(true);
  }

  // Capture the lead but never let a slow/failed network block the UI: the
  // request still fires (and lands in the CRM on the live host), we just stop
  // awaiting after a few seconds.
  async function captureLeadSafe(email: string) {
    try {
      await Promise.race([
        captureLead(email),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
    } catch (e) {
      console.error("Lead submission failed:", e);
    }
  }

  const buildPdf = (override?: Partial<OfferSpec>) =>
    generateOfferPdf({
      t,
      lang,
      address,
      sections,
      pitch,
      spec: override ? { ...spec, ...override } : spec,
      pricing,
      company,
      totals: tot,
    });

  // CTA: submit the lead, then show the confirmation.
  async function handleSubmit() {
    setSubmitting(true);
    await captureLeadSafe(spec.email);
    setSubmitting(false);
    setSubmitted(true);
  }

  // Download button: gate behind an email (saved to CRM) the first time.
  function requestDownload() {
    if (leadCaptured) {
      buildPdf();
      return;
    }
    setGateEmail(spec.email || "");
    setGateError(null);
    setGateOpen(true);
  }

  async function confirmGate() {
    const email = gateEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setGateError(t("offer.gateInvalid"));
      return;
    }
    setGateSubmitting(true);
    update({ email }); // reflect into the form so it shows in the PDF / details
    await captureLeadSafe(email);
    setGateSubmitting(false);
    setGateOpen(false);
    buildPdf({ email });
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-61px)] max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand">
          <svg
            className="h-8 w-8 text-ink"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight">
          {t("offer.successTitle")}
        </h2>
        <p className="mt-3 text-muted">
          {t("offer.successBody", {
            name: spec.name || (lang === "de" ? "" : "there"),
            addr: address.label.split(",")[0],
            email: spec.email || (lang === "de" ? "Sie" : "you"),
          })}
        </p>
        <div className="mt-6 w-full rounded-2xl border border-black/10 bg-brand-soft p-5">
          <p className="text-sm text-muted">{t("offer.indicativePrice")}</p>
          <p className="text-3xl font-extrabold text-ink">
            {money(estimate.low)} – {money(estimate.high)}
          </p>
        </div>
        <button
          onClick={() => buildPdf()}
          className="mt-5 flex items-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:bg-ink-2"
        >
          <PdfIcon /> {t("offer.downloadPdf")}
        </button>
        <p className="mt-6 text-xs text-muted">{t("offer.behindLink")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
      {/* Spec form */}
      <div>
        <button
          onClick={onBack}
          className="mb-3 text-sm font-medium text-muted hover:text-ink"
        >
          ← {t("offer.back")}
        </button>
        <h2 className="text-2xl font-extrabold tracking-tight">
          {t("offer.title")}
        </h2>
        <p className="mt-1 text-muted">{t("offer.sub")}</p>

        {/* Company (white-labels the PDF) */}
        <Field label={t("offer.company")}>
          <button
            onClick={() => setShowCompany((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl border border-black/10 px-3 py-2.5 text-left text-sm font-semibold transition hover:border-black/20"
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-black/10"
              style={{ background: company.accent }}
            />
            <span className="flex-1 truncate text-ink">
              {company.name || t("offer.companyName")}
            </span>
            <svg
              className={`h-4 w-4 text-muted transition ${showCompany ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          {showCompany && (
            <CompanyEditor company={company} onChange={setCompany} />
          )}
        </Field>

        <Field label={t("offer.material")}>
          <div className="grid grid-cols-2 gap-2">
            {pricing.tiles.map((m) => (
              <Choice
                key={m.id}
                active={spec.material === m.id}
                onClick={() => update({ material: m.id })}
              >
                <span className="block">{m.name}</span>
                <span className="mt-0.5 block text-xs font-normal opacity-60">
                  {money(m.rate)}/m²
                </span>
              </Choice>
            ))}
          </div>
          <button
            onClick={() => setShowPricing((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline"
          >
            <svg
              className={`h-4 w-4 transition ${showPricing ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
            {t("offer.customize")}
          </button>
          {showPricing && (
            <PricingEditor pricing={pricing} onChange={setPricing} onReset={reset} />
          )}
        </Field>

        <Field label={t("offer.projectType")}>
          <div className="grid grid-cols-3 gap-2">
            {SCOPES.map((s) => (
              <Choice
                key={s.key}
                active={spec.scope === s.key}
                onClick={() => update({ scope: s.key })}
              >
                {t(s.labelKey)}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label={t("offer.options")}>
          <p className="-mt-1 mb-2 text-xs text-muted">{t("offer.optionsHint")}</p>
          <div className="flex flex-col gap-2">
            {pricing.addons.map((a) => (
              <Toggle
                key={a.id}
                checked={spec.selectedAddons.includes(a.id)}
                onChange={() => toggleAddon(a.id)}
                label={a.name}
                hint={`+ ${money(a.rate)}/m²`}
              />
            ))}
          </div>
        </Field>

        <Field label={t("offer.yourDetails")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder={t("offer.name")}
              value={spec.name}
              onChange={(v) => update({ name: v })}
            />
            <Input
              placeholder={t("offer.email")}
              type="email"
              value={spec.email}
              onChange={(v) => update({ email: v })}
            />
            <Input
              placeholder={t("offer.phone")}
              value={spec.phone}
              onChange={(v) => update({ phone: v })}
            />
            <Input
              placeholder={t("offer.postcode")}
              value={spec.postcode}
              onChange={(v) => update({ postcode: v })}
            />
          </div>
        </Field>
      </div>

      {/* Sticky offer summary */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-black/10 shadow-sm">
          <div className="bg-ink px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {t("offer.indicative")}
            </p>
            <p className="mt-1 text-3xl font-extrabold">
              {money(estimate.low)}
              <span className="text-white/50"> – </span>
              {money(estimate.high)}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {t("offer.perM2Surface", {
                rate: money(estimate.perM2),
                area: fmt(tot.surfaceM2),
              })}
            </p>
          </div>
          <div className="space-y-2 bg-white px-5 py-4 text-sm">
            <Row k={t("roof.surface")} v={`${fmt(tot.surfaceM2)} m²`} />
            <Row k={t("roof.footprint")} v={`${fmt(tot.footprintM2)} m²`} />
            <Row k={t("roof.sections")} v={`${tot.sectionCount}`} />
            <Row k={t("offer.pitchLabel")} v={t(pitch.labelKey)} />
            <div className="my-2 h-px bg-black/10" />
            <button
              onClick={handleSubmit}
              disabled={!spec.email || submitting}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-ink transition enabled:hover:bg-brand-dark enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "…" : t("offer.cta")}
            </button>
            <button
              onClick={requestDownload}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 py-3 text-sm font-bold text-ink transition hover:bg-black/[0.03]"
            >
              <PdfIcon /> {t("offer.downloadPdf")}
            </button>
            <p className="text-center text-[11px] text-muted">
              {t("offer.noObligation")}
            </p>
          </div>
        </div>
      </aside>

      {gateOpen && (
        <EmailGate
          email={gateEmail}
          setEmail={setGateEmail}
          error={gateError}
          submitting={gateSubmitting}
          onConfirm={confirmGate}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </div>
  );
}

function EmailGate({
  email,
  setEmail,
  error,
  submitting,
  onConfirm,
  onCancel,
}: {
  email: string;
  setEmail: (v: string) => void;
  error: string | null;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/50 p-5 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand/15">
          <PdfIcon />
        </div>
        <h3 className="text-lg font-extrabold tracking-tight text-ink">
          {t("offer.gateTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">{t("offer.gateText")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm();
          }}
        >
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("offer.gateEmail")}
            className="mt-4 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
          />
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-ink transition enabled:hover:bg-brand-dark enabled:hover:text-white disabled:opacity-50"
          >
            {submitting ? "…" : (
              <>
                <PdfIcon /> {t("offer.gateButton")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-muted transition hover:text-ink"
          >
            {t("offer.gateCancel")}
          </button>
        </form>
      </div>
    </div>
  );
}

function CompanyEditor({
  company,
  onChange,
}: {
  company: CompanyProfile;
  onChange: (c: CompanyProfile) => void;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<CompanyProfile>) =>
    onChange({ ...company, ...patch });

  return (
    <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
      <p className="mb-3 text-xs text-muted">{t("offer.companyHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <SmallInput
          label={t("offer.companyName")}
          value={company.name}
          onChange={(v) => set({ name: v })}
          full
        />
        <SmallInput
          label={t("offer.companyStreet")}
          value={company.street}
          onChange={(v) => set({ street: v })}
        />
        <SmallInput
          label={t("offer.companyCity")}
          value={company.city}
          onChange={(v) => set({ city: v })}
        />
        <SmallInput
          label={t("offer.companyPhone")}
          value={company.phone}
          onChange={(v) => set({ phone: v })}
        />
        <SmallInput
          label={t("offer.companyEmail")}
          value={company.email}
          onChange={(v) => set({ email: v })}
        />
        <SmallInput
          label={t("offer.companyWebsite")}
          value={company.website}
          onChange={(v) => set({ website: v })}
        />
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
            {t("offer.companyAccent")}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={company.accent}
              onChange={(e) => set({ accent: e.target.value })}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-black/10 bg-white p-0.5"
            />
            <input
              value={company.accent}
              onChange={(e) => set({ accent: e.target.value })}
              className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm tabular-nums uppercase outline-none focus:border-brand"
            />
          </div>
        </label>
      </div>
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function PricingEditor({
  pricing,
  onChange,
  onReset,
}: {
  pricing: Pricing;
  onChange: (p: Pricing) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();

  const updateTile = (id: string, patch: Partial<Pricing["tiles"][number]>) =>
    onChange({
      ...pricing,
      tiles: pricing.tiles.map((tl) =>
        tl.id === id ? { ...tl, ...patch } : tl
      ),
    });
  const removeTile = (id: string) =>
    onChange({ ...pricing, tiles: pricing.tiles.filter((tl) => tl.id !== id) });
  const addTile = () =>
    onChange({
      ...pricing,
      tiles: [
        ...pricing.tiles,
        {
          id: `c_${pricing.tiles.length}_${Math.round(performance.now())}`,
          name: "",
          rate: 150,
        },
      ],
    });

  const updateAddon = (id: string, patch: Partial<Pricing["addons"][number]>) =>
    onChange({
      ...pricing,
      addons: pricing.addons.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    });
  const removeAddon = (id: string) =>
    onChange({ ...pricing, addons: pricing.addons.filter((a) => a.id !== id) });
  const addAddon = () =>
    onChange({
      ...pricing,
      addons: [
        ...pricing.addons,
        {
          id: `a_${pricing.addons.length}_${Math.round(performance.now())}`,
          name: "",
          rate: 20,
        },
      ],
    });

  return (
    <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
      <p className="mb-2 text-xs text-muted">{t("offer.customizeHint")}</p>

      <EditorRows
        nameLabel={t("offer.tileName")}
        rateLabel={t("offer.ratePerM2")}
        rows={pricing.tiles}
        onUpdate={updateTile}
        onRemove={removeTile}
        canRemove={pricing.tiles.length > 1}
      />
      <AddButton onClick={addTile} label={t("offer.addTile")} />

      <div className="mt-3 border-t border-black/10 pt-3">
        <EditorRows
          nameLabel={t("offer.addons")}
          rateLabel={t("offer.ratePerM2")}
          rows={pricing.addons}
          onUpdate={updateAddon}
          onRemove={removeAddon}
          canRemove={pricing.addons.length > 1}
        />
        <AddButton onClick={addAddon} label={t("offer.addAddon")} />
      </div>

      <button
        onClick={onReset}
        className="mt-3 text-xs font-medium text-muted hover:text-ink hover:underline"
      >
        {t("offer.resetPricing")}
      </button>
    </div>
  );
}

function EditorRows({
  nameLabel,
  rateLabel,
  rows,
  onUpdate,
  onRemove,
  canRemove,
}: {
  nameLabel: string;
  rateLabel: string;
  rows: { id: string; name: string; rate: number }[];
  onUpdate: (id: string, patch: { name?: string; rate?: number }) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <>
      <div className="mb-1 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-muted">
        <span className="flex-1">{nameLabel}</span>
        <span className="w-20 text-right">{rateLabel}</span>
        <span className="w-6" />
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <input
              value={r.name}
              onChange={(e) => onUpdate(r.id, { name: e.target.value })}
              placeholder={nameLabel}
              className="flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              type="number"
              min={0}
              value={r.rate}
              onChange={(e) => onUpdate(r.id, { rate: Number(e.target.value) || 0 })}
              className="w-20 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums outline-none focus:border-brand"
            />
            <button
              onClick={() => onRemove(r.id)}
              disabled={!canRemove}
              className="flex h-7 w-6 items-center justify-center rounded-md text-muted transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
              aria-label="Remove row"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </button>
  );
}

function PdfIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 3v5h5M14 3H6v18h12V8M9 13h6M9 17h4" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <label className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-brand bg-brand/10 text-ink"
          : "border-black/10 text-muted hover:border-black/20"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2.5 text-left text-sm transition hover:border-black/20"
    >
      <span
        className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
          checked ? "bg-brand" : "bg-black/15"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
      <span className="flex-1 font-medium text-ink">{label}</span>
      {hint && <span className="shrink-0 text-xs text-muted">{hint}</span>}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
    />
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
