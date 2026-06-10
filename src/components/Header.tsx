"use client";

import { Logo } from "./Logo";
import { useI18n, type Lang } from "../i18n";
import type { Step } from "../types";

const STEPS: { key: Step; labelKey: string }[] = [
  { key: "search", labelKey: "step.search" },
  { key: "roof", labelKey: "step.roof" },
  { key: "offer", labelKey: "step.offer" },
];

export function Header({ step }: { step: Step }) {
  const { t, lang, setLang } = useI18n();
  const activeIndex = STEPS.findIndex((s) => s.key === step);
  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white/80 px-5 py-3 backdrop-blur md:px-8">
      <Logo />
      <ol className="hidden items-center gap-1 sm:flex">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li key={s.key} className="flex items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  active
                    ? "bg-brand text-ink"
                    : done
                      ? "bg-brand/20 text-brand-dark"
                      : "bg-black/5 text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`mr-2 text-sm font-medium ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {t(s.labelKey)}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mr-2 h-px w-6 bg-black/10" />
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-3">
        <LangToggle lang={lang} setLang={setLang} />
        <a
          href="https://www.airteam.ai/en"
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2"
        >
          {t("nav.demo")}
        </a>
      </div>
    </header>
  );
}

function LangToggle({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-black/10 p-0.5 text-xs font-bold">
      {(["de", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            lang === l ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}