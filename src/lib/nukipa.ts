// Single shared Nukipa client factory.
//
// Server components and route handlers call `getNukipaClient()` to get a
// client wired with the visitor host. Edge middleware can't use Next's
// `headers()` API, so it has its own factory `getMiddlewareClient(req)`
// that takes the request directly.
//
// DO NOT bypass this file with raw fetch() calls to /public/v1/*. The SDK
// handles host resolution, caching, visitor headers, and version pinning
// so every consumer behaves consistently.

import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import {
  createNukipaClient,
  type NukipaClient
} from '@nukipa/site-sdk';

const GATEWAY_URL = process.env.NUKIPA_GATEWAY_URL;
if (!GATEWAY_URL) {
  // Fail loud at module load. Without this the first SDK call throws a
  // generic 500 on every page; the env-var error here points at the fix.
  throw new Error('NUKIPA_GATEWAY_URL is not set. Add it to .env.local (see .env.example).');
}

const TENANT_HOST = process.env.NUKIPA_TENANT_HOST?.trim() || null;

/*
 * Host-resolution priority: actual VISITOR host first, NUKIPA_TENANT_HOST
 * as a fallback for build-time / edge contexts without request headers.
 *
 * The env-var override must NOT win unconditionally — when the site has
 * a live custom domain attached, every request to that domain has to
 * forward the visitor host (`nukipa.com`, etc.) so the gateway can
 * resolve the matching `tenant_domains` row and return the
 * per-domain `google_verification_token` the layout's `<meta>` tag
 * needs for Google Search Console verification. Forcing the staging
 * host would route to the subdomain resolver path which doesn't carry
 * the token, and GSC stalls forever at "verification token could not
 * be found on your site".
 */

/** For server components / route handlers - reads `headers()`. */
export async function getNukipaClient(): Promise<NukipaClient> {
  const h = await headers();
  return createNukipaClient({
    gatewayUrl: GATEWAY_URL!,
    getHost:    () => h.get('x-forwarded-host') || h.get('host') || TENANT_HOST || ''
  });
}

/** For edge middleware - `headers()` is unavailable; pass the NextRequest. */
export function getMiddlewareClient(req: NextRequest): NukipaClient {
  return createNukipaClient({
    gatewayUrl:   GATEWAY_URL!,
    getHost:      () => req.headers.get('x-forwarded-host') || req.headers.get('host') || TENANT_HOST || '',
    getIp:        () => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    getUserAgent: () => req.headers.get('user-agent'),
    getReferer:   () => req.headers.get('referer')
  });
}
