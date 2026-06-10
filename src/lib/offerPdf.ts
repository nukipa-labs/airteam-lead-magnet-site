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
import { renderRoofSatelliteImage } from "./satelliteImage";

type T = (k: string, vars?: Record<string, string | number>) => string;
type RGB = [number, number, number];

const FALLBACK_ACCENT: RGB = [35, 231, 165];
const INK: RGB = [14, 16, 16];
const MUTED: RGB = [110, 116, 124];
const HAIR: RGB = [226, 229, 231];
const WHITE: RGB = [255, 255, 255];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function safeAccent(hex: string): RGB {
  return /^#?[0-9a-fA-F]{6}$/.test((hex || "").trim())
    ? hexToRgb(hex.trim())
    : FALLBACK_ACCENT;
}
function lighten(rgb: RGB, amt: number): RGB {
  return rgb.map((c) => Math.round(c + (255 - c) * amt)) as RGB;
}
function luminance([r, g, b]: RGB) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
/** Pick black/white text that reads on the given background colour. */
function contrastOn(bg: RGB): RGB {
  return luminance(bg) > 0.62 ? INK : WHITE;
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
  const ACCENT_SOFT = lighten(ACCENT, 0.85);
  const ON_ACCENT = contrastOn(ACCENT);
  const ON_ACCENT_DIM: RGB =
    ON_ACCENT === WHITE ? [235, 238, 240] : [70, 74, 78];

  const est = computeEstimate(
    pricing,
    { material: spec.material, scope: spec.scope, selectedAddons: spec.selectedAddons },
    totals.surfaceM2
  );

  // Build the satellite image up front (async); fall back to the vector schematic.
  const sat = await renderRoofSatelliteImage(sections);

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
  const PH = 297;
  const M = 16;
  const W = PW - 2 * M;
  const colR = M + W / 2;

  const setText = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  // A small accent square + uppercase label — used as section headers.
  const tick = (txt: string, x: number, yy: number) => {
    setFill(ACCENT);
    doc.rect(x, yy - 2.3, 1.7, 1.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(MUTED);
    doc.text(txt.toUpperCase(), x + 3.2, yy);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const quotePrefix =
    company.name.match(/\b\p{L}/gu)?.join("").slice(0, 3).toUpperCase() || "ANG";
  const quoteNo = `${quotePrefix}-${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(
    Math.floor(now.getTime() / 1000) % 1000
  ).padStart(3, "0")}`;

  const companyName = (company.name || t("pdf.companyFallback")).trim();

  // ---------- Header ----------
  setFill(ACCENT);
  doc.rect(0, 0, PW, 3, "F");

  let y = 18;
  setFill(ACCENT);
  doc.roundedRect(M, y - 7.5, 7.5, 7.5, 1.5, 1.5, "F");
  setText(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(companyName, M + 10.5, y - 2, { maxWidth: 104 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(MUTED);
  doc.text(t("pdf.tagline"), M + 10.5, y + 3.4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  setText(INK);
  doc.text(t("pdf.quote"), PW - M, y - 3, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(MUTED);
  doc.text(`${t("pdf.quoteNo")}: ${quoteNo}`, PW - M, y + 2, { align: "right" });
  doc.text(`${t("pdf.date")}: ${dateStr}`, PW - M, y + 6.3, { align: "right" });

  y = 30;
  setDraw(HAIR);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + W, y);

  // ---------- From / For ----------
  y = 38;
  tick(t("pdf.from"), M, y);
  tick(t("pdf.for"), colR, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(INK);
  const fromLines = [
    companyName,
    company.street,
    company.city,
    company.phone,
    company.email,
    company.website,
  ].filter(Boolean);
  const forLines = [
    (spec.name || "—").trim(),
    spec.email,
    spec.phone,
    spec.postcode,
  ].filter(Boolean);
  const lineH = 4.4;
  fromLines.forEach((l, i) => doc.text(l, M, y + 5.5 + i * lineH));
  forLines.forEach((l, i) => doc.text(l, colR, y + 5.5 + i * lineH));
  y = y + 5.5 + Math.max(fromLines.length, forLines.length) * lineH + 4;

  // ---------- Object address ----------
  tick(t("pdf.object"), M, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(INK);
  const addrLines = doc.splitTextToSize(address.label, W) as string[];
  doc.text(addrLines, M, y);
  y += addrLines.length * lineH + 4;

  // ---------- Measurement chips ----------
  tick(t("pdf.measurement"), M, y);
  y += 3.5;
  const chips: [string, string][] = [
    [`${num(totals.surfaceM2)} m²`, t("roof.surface")],
    [`${num(totals.footprintM2)} m²`, t("roof.footprint")],
    [`${num(totals.perimeterM)} m`, t("roof.perimeter")],
    [`${totals.sectionCount}`, t("roof.sections")],
    [t(pitch.labelKey), t("offer.pitchLabel")],
  ];
  const gap = 3;
  const chipW = (W - gap * 4) / 5;
  const chipH = 15;
  chips.forEach(([val, lab], i) => {
    const x = M + i * (chipW + gap);
    setFill(ACCENT_SOFT);
    doc.roundedRect(x, y, chipW, chipH, 1.4, 1.4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 4 ? 8 : 10.5);
    setText(INK);
    doc.text(String(val), x + chipW / 2, y + (i === 4 ? 7 : 6.6), {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    setText(MUTED);
    doc.text(lab, x + chipW / 2, y + 11.6, { align: "center" });
  });
  y += chipH + 5;

  // ---------- Roof: satellite image (or schematic fallback) ----------
  tick(t("pdf.yourRoof"), M, y);
  y += 3;
  const imgMaxH = 48;
  if (sat) {
    const ratio = sat.h / sat.w;
    let dispW = W;
    let dispH = W * ratio;
    if (dispH > imgMaxH) {
      dispH = imgMaxH;
      dispW = imgMaxH / ratio;
    }
    const ix = M + (W - dispW) / 2;
    doc.addImage(sat.dataUrl, "JPEG", ix, y, dispW, dispH);
    setDraw(HAIR);
    doc.setLineWidth(0.4);
    doc.roundedRect(ix, y, dispW, dispH, 1.2, 1.2, "S");
    // imagery credit
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.6);
    setText([255, 255, 255]);
    doc.text(t("pdf.satAttribution"), ix + dispW - 1.5, y + dispH - 1.5, {
      align: "right",
    });
    y += dispH + 6;
  } else {
    const boxH = 32;
    setDraw(HAIR);
    setFill([250, 250, 250]);
    doc.roundedRect(M, y, W, boxH, 1.5, 1.5, "FD");
    drawRoofSchematic(doc, sections, M + 4, y + 4, W - 8, boxH - 8);
    y += boxH + 6;
  }

  // ---------- Line items ----------
  const cols = { item: M, qty: M + 100, unit: M + 130, amount: M + W };
  setFill(INK);
  doc.rect(M, y, W, 7.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(WHITE);
  doc.text(t("pdf.position"), cols.item + 2.5, y + 5);
  doc.text(t("pdf.qty"), cols.qty, y + 5, { align: "right" });
  doc.text(t("pdf.unit"), cols.unit, y + 5, { align: "right" });
  doc.text(t("pdf.amount"), cols.amount - 2.5, y + 5, { align: "right" });
  y += 7.5;

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

  doc.setFontSize(8.5);
  rows.forEach((r, i) => {
    const rh = 7.2;
    if (i % 2 === 1) {
      setFill([247, 248, 249]);
      doc.rect(M, y, W, rh, "F");
    }
    doc.setFont("helvetica", "normal");
    setText(INK);
    doc.text(doc.splitTextToSize(r[0], 96)[0], cols.item + 2.5, y + 4.8);
    setText(MUTED);
    doc.text(r[1], cols.qty, y + 4.8, { align: "right" });
    doc.text(r[2], cols.unit, y + 4.8, { align: "right" });
    doc.setFont("helvetica", "bold");
    setText(INK);
    doc.text(r[3], cols.amount - 2.5, y + 4.8, { align: "right" });
    y += rh;
  });

  // subtotal + scope factor
  setDraw(HAIR);
  doc.line(M, y, M + W, y);
  y += 5.5;
  const sumRow = (lab: string, val: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(MUTED);
    doc.text(lab, cols.unit, y, { align: "right" });
    setText(INK);
    doc.text(val, cols.amount - 2.5, y, { align: "right" });
    y += 5;
  };
  sumRow(t("pdf.subtotal"), money(est.subtotal));
  if (est.scopeFactor !== 1)
    sumRow(
      t("pdf.scopeFactor", { scope: t(`scope.${spec.scope}`) }),
      `× ${num(est.scopeFactor, 2)}`
    );
  y += 1.5;

  // ---------- Total box (roofer's accent colour) ----------
  const totalH = 17;
  setFill(ACCENT);
  doc.roundedRect(M, y, W, totalH, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(ON_ACCENT);
  doc.text(t("pdf.total"), M + 6, y + 7.5);
  doc.setFontSize(18);
  doc.text(money(est.total), M + W - 6, y + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  setText(ON_ACCENT_DIM);
  doc.text(
    t("pdf.range", { low: money(est.low), high: money(est.high) }),
    M + W - 6,
    y + 13,
    { align: "right" }
  );
  y += totalH + 6;

  // ---------- Disclaimer ----------
  const discLines = doc.splitTextToSize(t("pdf.disclaimer"), W - 8) as string[];
  const discH = discLines.length * 3.6 + 9;
  setFill([247, 248, 249]);
  doc.roundedRect(M, y, W, discH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(MUTED);
  doc.text(discLines, M + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text(t("pdf.vatNote"), M + 4, y + discH - 3);

  // ---------- Footer ----------
  setDraw(HAIR);
  doc.line(M, PH - 12, M + W, PH - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(MUTED);
  doc.text(t("pdf.poweredBy"), PW / 2, PH - 7, { align: "center" });

  const safeAddr = address.label
    .split(",")[0]
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 40);
  doc.save(`${t("pdf.filename")}-${safeAddr}.pdf`);
}

/** Fallback: draws each roof section as a filled polygon scaled to fit a box. */
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
  const map = (p: { x: number; y: number }) => ({
    x: offX + (p.x - minX) * scale,
    y: offY + (maxY - p.y) * scale,
  });

  sections.forEach((s, i) => {
    const pts = pts2d[i].map(map);
    if (pts.length < 3) return;
    const fill = lighten(hexToRgb(s.color), 0.5);
    const stroke = hexToRgb(s.color);
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.setLineWidth(0.5);
    const deltas = pts.slice(1).map((p, j) => [p.x - pts[j].x, p.y - pts[j].y]);
    doc.lines(deltas as unknown as number[][], pts[0].x, pts[0].y, [1, 1], "FD", true);
  });
  doc.setLineWidth(0.2);
}
