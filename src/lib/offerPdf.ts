import type { jsPDF } from "jspdf";
import type {
  AddressResult,
  CompanyProfile,
  OfferSpec,
  Pitch,
  Pricing,
  RoofSection,
} from "../types";
import type { RoofTotals } from "./roofMath";
import { computeEstimate } from "./pricing";

type T = (k: string, vars?: Record<string, string | number>) => string;

const FALLBACK_ACCENT: [number, number, number] = [35, 231, 165];
const INK: [number, number, number] = [14, 16, 16];
const MUTED: [number, number, number] = [107, 114, 128];
const HAIR: [number, number, number] = [225, 228, 228];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
/** Parse a user-entered accent colour, falling back to the brand teal. */
function safeAccent(hex: string): [number, number, number] {
  return /^#?[0-9a-fA-F]{6}$/.test((hex || "").trim())
    ? hexToRgb(hex.trim())
    : FALLBACK_ACCENT;
}
function lighten(rgb: [number, number, number], amt = 0.55): [number, number, number] {
  return rgb.map((c) => Math.round(c + (255 - c) * amt)) as [number, number, number];
}

export type OfferPdfData = {
  t: T;
  lang: "de" | "en";
  address: AddressResult;
  sections: RoofSection[];
  pitch: Pitch;
  spec: OfferSpec;
  pricing: Pricing;
  company: CompanyProfile;
  totals: RoofTotals;
};

export async function generateOfferPdf(d: OfferPdfData) {
  const { jsPDF } = await import("jspdf"); // lazy-loaded so it stays off the landing bundle
  const { t, lang, address, sections, pitch, spec, pricing, company, totals } = d;
  const ACCENT = safeAccent(company.accent);
  const ACCENT_SOFT = lighten(ACCENT, 0.82);
  const est = computeEstimate(
    pricing,
    {
      material: spec.material,
      scope: spec.scope,
      selectedAddons: spec.selectedAddons,
    },
    totals.surfaceM2
  );

  const money = (n: number) =>
    new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  const num = (n: number, dig = 0) =>
    new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US", {
      minimumFractionDigits: dig,
      maximumFractionDigits: dig,
    }).format(n);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210;
  const M = 18;
  const W = PW - 2 * M;
  let y = 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const quotePrefix =
    (company.name.match(/\b\p{L}/gu)?.join("").slice(0, 3).toUpperCase()) ||
    "ANG";
  const quoteNo = `${quotePrefix}-${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(
    Math.floor(now.getTime() / 1000) % 1000
  ).padStart(3, "0")}`;

  // ---- Top accent band (roofer's colour) ----
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PW, 4, "F");

  // ---- Company wordmark ----
  y = 20;
  const companyName = (company.name || t("pdf.companyFallback")).trim();
  doc.setFillColor(...ACCENT);
  doc.roundedRect(M, y - 7, 7, 7, 1.4, 1.4, "F");
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(companyName, M + 10, y - 1.5, { maxWidth: 108 });

  // ---- Quote title (right) ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text(t("pdf.quote"), PW - M, y - 3, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${t("pdf.quoteNo")}: ${quoteNo}`, PW - M, y + 2, { align: "right" });
  doc.text(`${t("pdf.date")}: ${dateStr}`, PW - M, y + 6.5, { align: "right" });

  // ---- From / For blocks ----
  y = 38;
  const colR = M + W / 2;
  const label = (txt: string, x: number, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(txt.toUpperCase(), x, yy);
  };
  label(t("pdf.from"), M, y);
  label(t("pdf.for"), colR, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);

  const fromLines = [
    companyName,
    company.street || "",
    company.city || "",
    company.phone || "",
    company.email || "",
    company.website || "",
  ].filter(Boolean);
  const customer = (spec.name || "—").trim();
  const forLines = [
    customer,
    spec.email || "",
    spec.phone || "",
    [spec.postcode].filter(Boolean).join(" "),
  ].filter(Boolean);
  fromLines.forEach((l, i) => doc.text(l, M, y + 6 + i * 5));
  forLines.forEach((l, i) => doc.text(l, colR, y + 6 + i * 5));

  // ---- Object address ----
  y = 44 + Math.max(fromLines.length, forLines.length) * 5 + 6;
  label(t("pdf.object"), M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const addrLines = doc.splitTextToSize(address.label, W);
  doc.text(addrLines, M, y + 6);
  y += 6 + addrLines.length * 5 + 4;

  // ---- Measurement chips ----
  label(t("pdf.measurement"), M, y);
  y += 4;
  const chips: [string, string][] = [
    [`${num(totals.surfaceM2)} m²`, t("roof.surface")],
    [`${num(totals.footprintM2)} m²`, t("roof.footprint")],
    [`${num(totals.perimeterM)} m`, t("roof.perimeter")],
    [`${totals.sectionCount}`, t("roof.sections")],
    [t(pitch.labelKey), t("offer.pitchLabel")],
  ];
  const chipW = (W - 4 * 3) / 5;
  chips.forEach(([val, lab], i) => {
    const x = M + i * (chipW + 3);
    doc.setFillColor(...ACCENT_SOFT);
    doc.roundedRect(x, y, chipW, 16, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 4 ? 8.5 : 11);
    doc.setTextColor(...INK);
    doc.text(String(val), x + chipW / 2, y + (i === 4 ? 7.5 : 7), {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(lab, x + chipW / 2, y + 12.5, { align: "center" });
  });
  y += 22;

  // ---- Roof schematic ----
  label(t("pdf.yourRoof"), M, y);
  y += 3;
  const boxH = 32;
  doc.setDrawColor(...HAIR);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(M, y, W, boxH, 1.5, 1.5, "FD");
  drawRoofSchematic(doc, sections, M + 4, y + 4, W - 8, boxH - 8);
  y += boxH + 6;

  // ---- Line items table ----
  const cols = { item: M, qty: M + 96, unit: M + 124, amount: M + W };
  doc.setFillColor(...INK);
  doc.rect(M, y, W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(t("pdf.position"), cols.item + 2, y + 5.3);
  doc.text(t("pdf.qty"), cols.qty, y + 5.3, { align: "right" });
  doc.text(t("pdf.unit"), cols.unit, y + 5.3, { align: "right" });
  doc.text(t("pdf.amount"), cols.amount - 2, y + 5.3, { align: "right" });
  y += 8;

  const rows: [string, string, string, string][] = [
    [
      t("pdf.baseCovering", { material: est.tileName }),
      `${num(totals.surfaceM2)} m²`,
      money(est.tileRate),
      money(est.coveringAmount),
    ],
    ...est.addonLines.map(
      (l): [string, string, string, string] => [
        l.name,
        `${num(totals.surfaceM2)} m²`,
        money(l.rate),
        money(l.amount),
      ]
    ),
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  rows.forEach((r, i) => {
    const rh = 7.4;
    if (i % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(M, y, W, rh, "F");
    }
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(r[0], 90)[0], cols.item + 2, y + 4.9);
    doc.setTextColor(...MUTED);
    doc.text(r[1], cols.qty, y + 4.9, { align: "right" });
    doc.text(r[2], cols.unit, y + 4.9, { align: "right" });
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(r[3], cols.amount - 2, y + 4.9, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += rh;
  });

  // subtotal + scope factor
  doc.setDrawColor(...HAIR);
  doc.line(M, y, M + W, y);
  y += 6;
  const sumRow = (lab: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(bold ? INK[0] : MUTED[0], bold ? INK[1] : MUTED[1], bold ? INK[2] : MUTED[2]);
    doc.text(lab, cols.unit, y, { align: "right" });
    doc.setTextColor(...INK);
    doc.text(val, cols.amount - 2, y, { align: "right" });
    y += 5.5;
  };
  sumRow(t("pdf.subtotal"), money(est.subtotal));
  if (est.scopeFactor !== 1)
    sumRow(
      t("pdf.scopeFactor", { scope: t(`scope.${spec.scope}`) }),
      `× ${num(est.scopeFactor, 2)}`
    );
  y += 1;

  // ---- Total box ----
  const totalH = 18;
  doc.setFillColor(...INK);
  doc.roundedRect(M, y, W, totalH, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(t("pdf.total"), M + 6, y + 8);
  doc.setFontSize(18);
  doc.setTextColor(...ACCENT);
  doc.text(money(est.total), M + W - 6, y + 8.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 220);
  doc.text(
    t("pdf.range", { low: money(est.low), high: money(est.high) }),
    M + W - 6,
    y + 14,
    { align: "right" }
  );
  y += totalH + 6;

  // ---- Disclaimer + footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(t("pdf.disclaimer"), W), M, y);
  doc.text(t("pdf.vatNote"), M, y + 10);

  // footer band — subtle "powered by" (the roofer's brand owns the document)
  doc.setDrawColor(...HAIR);
  doc.line(M, 285, M + W, 285);
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(t("pdf.poweredBy"), PW / 2, 290, { align: "center" });

  const safeAddr = address.label
    .split(",")[0]
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 40);
  doc.save(`${t("pdf.filename")}-${safeAddr}.pdf`);
}

/** Draws each roof section as a filled polygon, projected to local metres and
 *  scaled to fit the given box (north up). */
function drawRoofSchematic(
  doc: jsPDF,
  sections: RoofSection[],
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const all = sections.flatMap((s) => s.latlngs);
  if (all.length < 3) return;
  const lat0 = all.reduce((a, p) => a + p.lat, 0) / all.length;
  const cos = Math.cos((lat0 * Math.PI) / 180);
  const proj = (p: { lat: number; lng: number }) => ({
    x: p.lng * cos * 111320,
    y: p.lat * 110540,
  });

  const pts2d = sections.map((s) => s.latlngs.map(proj));
  const flat = pts2d.flat();
  const minX = Math.min(...flat.map((p) => p.x));
  const maxX = Math.max(...flat.map((p) => p.x));
  const minY = Math.min(...flat.map((p) => p.y));
  const maxY = Math.max(...flat.map((p) => p.y));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min(bw / spanX, bh / spanY) * 0.92;
  const offX = bx + (bw - spanX * scale) / 2;
  const offY = by + (bh - spanY * scale) / 2;
  // map projected point -> page mm (flip Y so north is up)
  const map = (p: { x: number; y: number }) => ({
    x: offX + (p.x - minX) * scale,
    y: offY + (maxY - p.y) * scale,
  });

  sections.forEach((s, i) => {
    const pts = pts2d[i].map(map);
    if (pts.length < 3) return;
    const fill = lighten(hexToRgb(s.color), 0.5);
    const stroke = hexToRgb(s.color);
    doc.setFillColor(...fill);
    doc.setDrawColor(...stroke);
    doc.setLineWidth(0.5);
    const deltas = pts.slice(1).map((p, j) => [p.x - pts[j].x, p.y - pts[j].y]);
    doc.lines(deltas as any, pts[0].x, pts[0].y, [1, 1], "FD", true);
  });
  doc.setLineWidth(0.2);
}
