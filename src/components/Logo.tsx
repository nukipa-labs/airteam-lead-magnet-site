"use client";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 3 L29 27 H21.5 L16 15 L10.5 27 H3 Z"
          fill="var(--color-brand)"
        />
      </svg>
      <span className="text-[19px] font-extrabold tracking-tight text-ink">
        airteam
      </span>
    </div>
  );
}