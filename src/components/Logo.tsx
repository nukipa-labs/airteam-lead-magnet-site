"use client";

// Real Airteam wordmark (teal "A" mark + "airteam" wordmark), pulled from
// airteam.ai. The SVG's mark is #23E7A5; the wordmark uses currentColor, which
// resolves to near-black when loaded via <img> — matching the brand.
export function Logo({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/airteam-logo.svg"
      alt="Airteam"
      width={124}
      height={26}
      className={`h-[26px] w-auto ${className}`}
    />
  );
}
