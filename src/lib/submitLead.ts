// Lead capture → Nukipa CRM.
//
// The browser posts to our own `/api/lead` route (same-origin → no CORS, no
// hung cross-origin request). That server route forwards to the Nukipa public
// form endpoint with the correct tenant host, and the submission lands in the
// CRM (crm_list_contacts) under source `form:roof-offer`.

export type LeadValues = Record<string, string | number | boolean>;

export async function submitLead(values: LeadValues): Promise<void> {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || body?.error || `HTTP ${res.status}`);
  }
}
