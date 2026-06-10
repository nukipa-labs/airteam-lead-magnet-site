import { NextResponse, type NextRequest } from "next/server";

// Server-side lead forwarder.
//
// The browser posts the lead here (same-origin, so no CORS and no hung
// cross-origin request). This route forwards it to the Nukipa public form
// endpoint WITH an explicit `X-Forwarded-Host`, which is how the gateway
// resolves the tenant. A browser can't set that header itself, so a direct
// browser->gateway POST only resolves the tenant on the tenant's own Nukipa
// domain — going through the server makes lead capture work everywhere,
// including local development.
//
// Host resolution priority:
//   1. NUKIPA_TENANT_HOST  — pin for local dev / staging (set in .env.local)
//   2. the incoming request host — on the deployed site this IS the tenant host
export const runtime = "nodejs";

const GATEWAY = (process.env.NUKIPA_GATEWAY_URL || "").replace(/\/+$/, "");
const FORM_SLUG = "roof-offer";

export async function POST(req: NextRequest) {
  if (!GATEWAY) {
    return NextResponse.json(
      { ok: false, error: "NUKIPA_GATEWAY_URL not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const host =
    process.env.NUKIPA_TENANT_HOST?.trim() ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "";

  try {
    const res = await fetch(
      `${GATEWAY}/public/v1/forms/${FORM_SLUG}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-Host": host },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { ok: res.ok }, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "request failed" },
      { status: 502 }
    );
  }
}
