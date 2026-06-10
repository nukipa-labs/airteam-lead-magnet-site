"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import {
  PITCHES,
  SECTION_COLORS,
  footprintArea,
  perimeter,
  totals,
  fmt,
} from "../lib/roofMath";
import { useI18n } from "../i18n";
import type { AddressResult, LatLng, RoofSection } from "../types";

type Props = {
  address: AddressResult;
  sections: RoofSection[];
  setSections: React.Dispatch<React.SetStateAction<RoofSection[]>>;
  pitchKey: string;
  setPitchKey: (k: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

function latlngsOf(layer: L.Polygon): LatLng[] {
  const ring = layer.getLatLngs()[0] as L.LatLng[];
  return ring.map((p) => ({ lat: p.lat, lng: p.lng }));
}

export function RoofMap({
  address,
  sections,
  setSections,
  pitchKey,
  setPitchKey,
  onBack,
  onContinue,
}: Props) {
  const { t } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.FeatureGroup | null>(null);
  const layersRef = useRef<Map<string, L.Polygon>>(new Map());
  const colorIdx = useRef(0);

  const [drawing, setDrawing] = useState(false);
  const [liveHint, setLiveHint] = useState<{ pts: number; m2: number } | null>(
    null
  );
  const [hoverId, setHoverId] = useState<string | null>(null);

  const pitch = PITCHES.find((p) => p.key === pitchKey) ?? PITCHES[2];
  const tot = totals(sections, pitch.angleDeg);

  // ---- Recompute a section's geometry from its live layer ----
  function syncSection(id: string) {
    const layer = layersRef.current.get(id);
    if (!layer) return;
    const latlngs = latlngsOf(layer);
    setSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              latlngs,
              footprintM2: footprintArea(latlngs),
              perimeterM: perimeter(latlngs),
            }
          : s
      )
    );
  }

  function styleLayer(layer: L.Polygon, color: string, active = false) {
    layer.setStyle({
      color,
      weight: active ? 4 : 3,
      fillColor: color,
      fillOpacity: active ? 0.35 : 0.22,
    });
  }

  function registerLayer(layer: L.Polygon, section: RoofSection) {
    layersRef.current.set(section.id, layer);
    styleLayer(layer, section.color);
    layer.addTo(groupRef.current!);
    layer.on("pm:edit", () => syncSection(section.id));
    layer.on("pm:dragend", () => syncSection(section.id));
    layer.on("mouseover", () => setHoverId(section.id));
    layer.on("mouseout", () => setHoverId(null));
    layer.pm.enable({ allowSelfIntersection: false });
  }

  // ---- Init map once ----
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, {
      center: [address.lat, address.lng],
      zoom: 20,
      zoomControl: true,
      maxZoom: 22,
    });
    mapRef.current = map;
    map.zoomControl.setPosition("topright");

    L.tileLayer(ESRI_IMAGERY, {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    }).addTo(map);
    L.tileLayer(ESRI_LABELS, {
      maxNativeZoom: 19,
      maxZoom: 22,
      opacity: 0.9,
    }).addTo(map);

    const group = L.featureGroup().addTo(map);
    groupRef.current = group;

    // Address pin
    const pin = L.divIcon({
      className: "",
      html: `<div style="transform:translate(-50%,-100%)">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#23e7a5" stroke="#0e1010" stroke-width="1.5">
        <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.4" fill="#0e1010" stroke="none"/></svg>
      </div>`,
      iconSize: [0, 0],
    });
    L.marker([address.lat, address.lng], { icon: pin, interactive: false }).addTo(
      map
    );

    // Global Geoman config (toolbar hidden via CSS).
    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 16,
      allowSelfIntersection: false,
      templineStyle: { color: "#23e7a5", weight: 3, dashArray: "6 6" } as any,
      hintlineStyle: { color: "#23e7a5", weight: 2, dashArray: "6 6" } as any,
      pathOptions: { color: "#23e7a5", fillColor: "#23e7a5", fillOpacity: 0.3 },
    });

    // Live readout while drawing.
    const recomputeLive = (e: any) => {
      const wl = e.workingLayer ?? (map.pm.Draw as any)?.Polygon?._layer;
      const ring =
        (wl?.getLatLngs?.()?.[0] as L.LatLng[]) ??
        (wl?.getLatLngs?.() as L.LatLng[]) ??
        [];
      const pts = ring.map((p: L.LatLng) => ({ lat: p.lat, lng: p.lng }));
      setLiveHint({ pts: pts.length, m2: footprintArea(pts) });
    };
    map.on("pm:drawstart", (e: any) => {
      setDrawing(true);
      setLiveHint({ pts: 0, m2: 0 });
      e.workingLayer?.on("pm:vertexadded", recomputeLive);
    });
    map.on("pm:drawend", () => {
      setDrawing(false);
      setLiveHint(null);
    });

    map.on("pm:create", (e: any) => {
      const layer = e.layer as L.Polygon;
      const latlngs = latlngsOf(layer);
      if (latlngs.length < 3) {
        layer.remove();
        return;
      }
      const color = SECTION_COLORS[colorIdx.current % SECTION_COLORS.length];
      colorIdx.current++;
      const id = `r_${colorIdx.current}_${Math.round(latlngs[0].lat * 1e5)}`;
      const section: RoofSection = {
        id,
        name: "",
        latlngs,
        footprintM2: footprintArea(latlngs),
        perimeterM: perimeter(latlngs),
        color,
      };
      // Geoman already put the layer on the map; adopt it.
      registerLayer(layer, section);
      setSections((prev) => [...prev, section]);
    });

    // Rebuild any sections already in state (e.g. returning from offer step).
    setSections((prev) => {
      prev.forEach((s) => {
        if (layersRef.current.has(s.id)) return;
        const poly = L.polygon(s.latlngs.map((p) => [p.lat, p.lng])) as L.Polygon;
        colorIdx.current = Math.max(colorIdx.current, 1);
        registerLayer(poly, s);
      });
      return prev;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
      layersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center if the address changes.
  useEffect(() => {
    mapRef.current?.setView([address.lat, address.lng], 20);
  }, [address.lat, address.lng]);

  // Reflect hover highlight onto layers.
  useEffect(() => {
    layersRef.current.forEach((layer, id) => {
      const s = sections.find((x) => x.id === id);
      if (s) styleLayer(layer, s.color, id === hoverId);
    });
  }, [hoverId, sections]);

  function startDraw() {
    if (!mapRef.current) return;
    mapRef.current.pm.enableDraw("Polygon", { finishOn: "dblclick" } as any);
  }
  function cancelDraw() {
    mapRef.current?.pm.disableDraw();
    setDrawing(false);
    setLiveHint(null);
  }
  function removeSection(id: string) {
    layersRef.current.get(id)?.remove();
    layersRef.current.delete(id);
    setSections((prev) => prev.filter((s) => s.id !== id));
  }
  function clearAll() {
    layersRef.current.forEach((l) => l.remove());
    layersRef.current.clear();
    setSections([]);
  }
  function fit() {
    const g = groupRef.current;
    if (g && g.getLayers().length) mapRef.current?.fitBounds(g.getBounds().pad(0.3));
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-61px)] lg:flex-row">
      {/* Map */}
      <div
        className={`relative h-[55vh] shrink-0 lg:h-auto lg:flex-1 ${
          drawing ? "roof-drawing" : ""
        }`}
      >
        {/* Leaflet owns this node's className — keep it static so React never
            overwrites the classes Leaflet adds imperatively. */}
        <div ref={mapEl} className="h-full w-full" />

        {/* Floating instruction / live readout */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] flex justify-center px-4">
          {drawing ? (
            <div className="pointer-events-auto flex max-w-[94vw] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-ink/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur sm:rounded-full sm:text-sm">
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-brand" />
              {t("roof.hintDraw")}
              {liveHint && liveHint.pts >= 3 && (
                <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink">
                  ≈ {fmt(liveHint.m2)} m²
                </span>
              )}
              <button
                onClick={cancelDraw}
                className="ml-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs hover:bg-white/25"
              >
                {t("roof.cancel")}
              </button>
            </div>
          ) : sections.length === 0 ? (
            <div className="pointer-events-auto hidden items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-ink shadow-lg sm:flex">
              👉 {t("roof.hintIdlePre")} <b>{t("roof.hintIdleBtn")}</b>{" "}
              {t("roof.hintIdlePost")}
            </div>
          ) : null}
        </div>

        {/* Map action buttons */}
        <div className="absolute bottom-5 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-2">
          {!drawing && (
            <button
              onClick={startDraw}
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-ink shadow-xl transition hover:bg-brand-dark hover:text-white"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M3 17 9 11l4 4 8-8M14 7h7v7" />
              </svg>
              {sections.length ? t("roof.traceAnother") : t("roof.trace")}
            </button>
          )}
          {sections.length > 0 && !drawing && (
            <button
              onClick={fit}
              className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink shadow-xl transition hover:bg-black/5"
            >
              {t("roof.fit")}
            </button>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-t border-black/5 bg-white lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="border-b border-black/5 px-5 py-4">
          <button
            onClick={onBack}
            className="mb-2 text-sm font-medium text-muted hover:text-ink"
          >
            ← {t("roof.changeAddress")}
          </button>
          <p className="line-clamp-2 text-sm font-semibold text-ink">
            {address.label}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Live totals */}
          <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-brand-soft to-white p-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t("roof.surface")} value={`${fmt(tot.surfaceM2)} m²`} big />
              <Stat label={t("roof.footprint")} value={`${fmt(tot.footprintM2)} m²`} />
              <Stat label={t("roof.perimeter")} value={`${fmt(tot.perimeterM)} m`} />
              <Stat label={t("roof.sections")} value={`${tot.sectionCount}`} />
            </div>
            <p className="mt-3 text-[11px] leading-snug text-muted">
              {t("roof.surfaceNote")}
            </p>
          </div>

          {/* Pitch */}
          <div className="mt-5">
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              {t("roof.pitch")}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PITCHES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPitchKey(p.key)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    p.key === pitchKey
                      ? "border-brand bg-brand/10 text-ink"
                      : "border-black/10 text-muted hover:border-black/20"
                  }`}
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Section list */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-muted">
                {t("roof.sectionList")}
              </label>
              {sections.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  {t("roof.clearAll")}
                </button>
              )}
            </div>

            {sections.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-sm text-muted">
                {t("roof.empty")}
              </div>
            ) : (
              <ul className="mt-2 space-y-2">
                {sections.map((s, i) => (
                  <li
                    key={s.id}
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      hoverId === s.id
                        ? "border-black/25 bg-black/[0.03]"
                        : "border-black/10"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {s.name || `${t("roof.section")} ${i + 1}`}
                      </p>
                      <p className="text-xs text-muted">
                        {fmt(s.footprintM2)} {t("roof.footprintShort")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSection(s.id)}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-500"
                      aria-label={t("roof.deleteSection")}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 7h16M9 7V5h6v2m-7 0 1 13h6l1-13" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-muted">{t("roof.tip")}</p>
          </div>
        </div>

        {/* Continue */}
        <div className="border-t border-black/5 px-5 py-4">
          <button
            disabled={sections.length === 0}
            onClick={onContinue}
            className="w-full rounded-xl bg-ink py-3.5 text-sm font-bold text-white transition enabled:hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("roof.continue")}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`font-extrabold tracking-tight text-ink ${
          big ? "text-2xl text-brand-dark" : "text-lg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}