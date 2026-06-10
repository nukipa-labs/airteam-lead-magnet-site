import type { RoofSection } from "../types";

// Builds a static satellite image of the traced roof (Esri World Imagery tiles
// stitched onto a canvas, with the roof outline drawn on top) and returns a JPEG
// data URL for embedding into the PDF. Returns null on any failure so the caller
// can fall back to the vector schematic.
//
// Esri tiles send `Access-Control-Allow-Origin: *`, so a crossOrigin canvas
// export is not tainted.

const ESRI = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const TILE = 256;
const MAX_NATIVE_Z = 19;

const lngToX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const latToY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 2 ** z;
};

function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = ESRI(z, x, y);
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export type SatImage = { dataUrl: string; w: number; h: number };

export async function renderRoofSatelliteImage(
  sections: RoofSection[]
): Promise<SatImage | null> {
  try {
    const pts = sections.flatMap((s) => s.latlngs);
    if (pts.length < 3) return null;

    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    for (const p of pts) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    // Pad so the roof isn't edge-to-edge.
    const padLat = Math.max((maxLat - minLat) * 0.35, 0.00012);
    const padLng = Math.max((maxLng - minLng) * 0.35, 0.00018);
    minLat -= padLat;
    maxLat += padLat;
    minLng -= padLng;
    maxLng += padLng;

    // Pick the highest zoom whose span fits a comfortable canvas.
    const MAXW = 1280,
      MAXH = 900;
    let z = MAX_NATIVE_Z;
    while (z > 13) {
      const w = (lngToX(maxLng, z) - lngToX(minLng, z)) * TILE;
      const h = (latToY(minLat, z) - latToY(maxLat, z)) * TILE;
      if (w <= MAXW && h <= MAXH) break;
      z--;
    }

    const originX = lngToX(minLng, z) * TILE;
    const originY = latToY(maxLat, z) * TILE;
    const canvasW = Math.max(2, Math.round((lngToX(maxLng, z) - lngToX(minLng, z)) * TILE));
    const canvasH = Math.max(2, Math.round((latToY(minLat, z) - latToY(maxLat, z)) * TILE));

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0e1010";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const xt0 = Math.floor(lngToX(minLng, z));
    const xt1 = Math.floor(lngToX(maxLng, z));
    const yt0 = Math.floor(latToY(maxLat, z));
    const yt1 = Math.floor(latToY(minLat, z));

    const jobs: Promise<void>[] = [];
    for (let xt = xt0; xt <= xt1; xt++) {
      for (let yt = yt0; yt <= yt1; yt++) {
        jobs.push(
          loadTile(z, xt, yt).then((img) => {
            if (img)
              ctx.drawImage(img, xt * TILE - originX, yt * TILE - originY);
          })
        );
      }
    }
    await Promise.all(jobs);

    // Draw each roof section: white halo + coloured stroke + translucent fill.
    const toPx = (lng: number, lat: number): [number, number] => [
      lngToX(lng, z) * TILE - originX,
      latToY(lat, z) * TILE - originY,
    ];
    for (const s of sections) {
      if (s.latlngs.length < 3) continue;
      ctx.beginPath();
      s.latlngs.forEach((p, i) => {
        const [x, y] = toPx(p.lng, p.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      const [r, g, b] = hexToRgb(s.color);
      ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
      ctx.fill();
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w: canvasW, h: canvasH };
  } catch {
    return null;
  }
}
