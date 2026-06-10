"use client";

import { useEffect, useMemo, useState } from "react";
import { PITCHES, totals, fmt } from "../lib/roofMath";
import { usePricing, computeEstimate } from "../lib/pricing";
import { generateOfferPdf } from "../lib/offerPdf";
import { submitLead } from "../lib/submitLead";
import { useI18n } from "../i18n";
import type { AddressResult, OfferSpec, RoofSection, Tile } from "../types";

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
  const pitch = PITCHES.find((p) => p.key === pitchKey) ?? PITCHES[2];
  const tot = totals(sections, pitch.angleDeg);

  const [spec, setSpec] = useState<OfferSpec>({
    pitchKey,
    material: pricing.tiles[0]?.id ?? "tile",
    scope: "new",
    removeOld: true,
    insulation: false,
    postcode: "",
    name: "",
    email: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Send the lead + measured-roof context to the Nukipa CMS form, then show
  // the confirmation. Capture is best-effort: if the gateway can't resolve
  // the tenant (e.g. a local preview not served on the tenant host) we still
  // show success rather than blocking the visitor, but log for debugging.
  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitLead({
        name: spec.name,
        email: spec.email,
        phone: spec.phone,
        postcode: spec.postcode,
        address: address.label,
        material: estimate.tileName,
        scope: spec.scope,
        pitch: t(pitch.labelKey),
        roof_surface_m2: Math.round(tot.surfaceM2),
        footprint_m2: Math.round(tot.footprintM2),
        sections: tot.sectionCount,
        price_low: Math.round(estimate.low),
        price_high: Math.round(estimate.high),
      });
    } catch (e) {
      console.error("Lead submission failed:", e);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  // Keep the selected material valid if it gets removed in the editor.
  useEffect(() => {
    if (!pricing.tiles.some((t) => t.id === spec.material)) {
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
          removeOld: spec.removeOld,
          insulation: spec.insulation,
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

  const downloadPdf = () =>
    generateOfferPdf({
      t,
      lang,
      address,
      sections,
      pitch,
      spec,
      pricing,
      totals: tot,
    });

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
          onClick={downloadPdf}
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
            <PricingEditor
              tiles={pricing.tiles}
              removeOldRate={pricing.removeOldRate}
              insulationRate={pricing.insulationRate}
              onChange={setPricing}
              onReset={reset}
            />
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
          <div className="flex flex-col gap-2">
            <Toggle
              checked={spec.removeOld}
              onChange={(v) => update({ removeOld: v })}
              label={t("offer.removeOld")}
            />
            <Toggle
              checked={spec.insulation}
              onChange={(v) => update({ insulation: v })}
              label={t("offer.insulation")}
            />
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
              onClick={downloadPdf}
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
    </div>
  );
}

function PricingEditor({
  tiles,
  removeOldRate,
  insulationRate,
  onChange,
  onReset,
}: {
  tiles: Tile[];
  removeOldRate: number;
  insulationRate: number;
  onChange: (p: {
    tiles: Tile[];
    removeOldRate: number;
    insulationRate: number;
  }) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const setTiles = (next: Tile[]) =>
    onChange({ tiles: next, removeOldRate, insulationRate });

  const updateTile = (id: string, patch: Partial<Tile>) =>
    setTiles(tiles.map((tl) => (tl.id === id ? { ...tl, ...patch } : tl)));
  const removeTile = (id: string) =>
    setTiles(tiles.filter((tl) => tl.id !== id));
  const addTile = () =>
    setTiles([
      ...tiles,
      { id: `c_${tiles.length}_${Math.round(performance.now())}`, name: "", rate: 150 },
    ]);

  return (
    <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
      <p className="mb-2 text-xs text-muted">{t("offer.customizeHint")}</p>

      {/* column heads */}
      <div className="mb-1 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-muted">
        <span className="flex-1">{t("offer.tileName")}</span>
        <span className="w-20 text-right">{t("offer.ratePerM2")}</span>
        <span className="w-6" />
      </div>
      <div className="space-y-1.5">
        {tiles.map((tl) => (
          <div key={tl.id} className="flex items-center gap-2">
            <input
              value={tl.name}
              onChange={(e) => updateTile(tl.id, { name: e.target.value })}
              placeholder={t("offer.tileName")}
              className="flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              type="number"
              min={0}
              value={tl.rate}
              onChange={(e) =>
                updateTile(tl.id, { rate: Number(e.target.value) || 0 })
              }
              className="w-20 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums outline-none focus:border-brand"
            />
            <button
              onClick={() => removeTile(tl.id)}
              disabled={tiles.length <= 1}
              className="flex h-7 w-6 items-center justify-center rounded-md text-muted transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
              aria-label="Remove tile"
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

      <button
        onClick={addTile}
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
        {t("offer.addTile")}
      </button>

      {/* add-on numbers */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/10 pt-3">
        <NumField
          label={t("offer.removeOldRate")}
          value={removeOldRate}
          onChange={(v) => onChange({ tiles, removeOldRate: v, insulationRate })}
        />
        <NumField
          label={t("offer.insulationRate")}
          value={insulationRate}
          onChange={(v) => onChange({ tiles, removeOldRate, insulationRate: v })}
        />
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

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-brand"
      />
    </label>
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2.5 text-left text-sm transition hover:border-black/20"
    >
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          checked ? "bg-brand" : "bg-black/15"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
      <span className="font-medium text-ink">{label}</span>
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