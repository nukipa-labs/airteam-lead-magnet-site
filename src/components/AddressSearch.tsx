"use client";

import { useEffect, useRef, useState } from "react";
import { searchAddress } from "../lib/geocode";
import { useI18n } from "../i18n";
import type { AddressResult } from "../types";

export function AddressSearch({
  onSelect,
}: {
  onSelect: (a: AddressResult) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced geocoding lookup.
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const r = await searchAddress(query, ctrl.signal);
        setResults(r);
        setOpen(true);
      } catch (e: any) {
        if (e.name !== "AbortError") setError(t("search.error"));
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, t]);

  // Close dropdown on outside click.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-61px)] max-w-6xl flex-col items-center justify-center px-5 py-12 text-center">
      {/* soft brand glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />
      </div>

      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-muted">
        <span className="pulse-dot h-2 w-2 rounded-full bg-brand" />
        {t("hero.badge")}
      </span>

      <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-6xl">
        {t("hero.pre")}{" "}
        <span className="text-brand-dark">{t("hero.accent")}</span>.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">{t("hero.sub")}</p>

      <div ref={boxRef} className="relative mt-9 w-full max-w-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] focus-within:border-brand">
          <svg
            className="ml-3 h-5 w-5 shrink-0 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={t("hero.placeholder")}
            className="w-full bg-transparent px-1 py-2.5 text-base text-ink outline-none placeholder:text-muted/70"
          />
          {loading && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black/10 border-t-brand" />
          )}
        </div>

        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-xl">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    onSelect(r);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-sm transition hover:bg-brand-soft"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" />
                    <circle cx="12" cy="10" r="2.6" />
                  </svg>
                  <span className="text-ink">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <p className="mt-3 text-xs text-muted">{t("hero.try")}</p>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted">
        {[t("hero.trust1"), t("hero.trust2"), t("hero.trust3")].map((label) => (
          <span key={label} className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-brand-dark"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m5 13 4 4L19 7" />
            </svg>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}