// Lead capture → Nukipa CMS form.
//
// Submissions land in cms.form_submissions and feed the CRM
// (crm_list_contacts). The form row with this slug must exist on the
// tenant (created at deploy time via POST /api/cms/forms) or the
// gateway answers `form_not_found`.
//
// Tenant resolution is by Host: when the site is served on the tenant's
// own Nukipa host the browser's Host header resolves the tenant
// automatically, so no auth/tenant id is needed here.

export const LEAD_FORM_SLUG = "roof-offer";

const GATEWAY = (
  process.env.NEXT_PUBLIC_NUKIPA_GATEWAY_URL ||
  process.env.NUKIPA_GATEWAY_URL ||
  ""
).replace(/\/+$/, "");

export type LeadValues = Record<string, string | number | boolean>;

export async function submitLead(values: LeadValues): Promise<void> {
  if (!GATEWAY) throw new Error("Missing NEXT_PUBLIC_NUKIPA_GATEWAY_URL");
  const res = await fetch(
    `${GATEWAY}/public/v1/forms/${encodeURIComponent(LEAD_FORM_SLUG)}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      credentials: "include",
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
}
