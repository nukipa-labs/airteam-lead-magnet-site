import { NextResponse, type NextRequest } from 'next/server';
import { getMiddlewareClient } from '@/lib/nukipa';

/**
 * Fire-and-forget page-view ping on every page navigation.
 *
 * The Nukipa platform tracks tenant visits via /public/v1/signals/visits;
 * the SDK's `recordVisit` handles the request shape, the session-cookie
 * cycle (`nk_sid`), and swallowing errors so a slow gateway can never
 * block a page load.
 *
 * We deliberately do NOT await the ping - the response goes out the
 * door while the visit row is being inserted server-side.
 */
export async function middleware(req: NextRequest) {
  const res    = NextResponse.next();
  const client = getMiddlewareClient(req);
  const url    = req.nextUrl;

  // Fire and forget. Any failure is silent (the SDK already swallows).
  void client.recordVisit({
    path:       url.pathname,
    session_id: req.cookies.get('nk_sid')?.value || null,
    utm: {
      source:   url.searchParams.get('utm_source')   || undefined,
      medium:   url.searchParams.get('utm_medium')   || undefined,
      campaign: url.searchParams.get('utm_campaign') || undefined,
      content:  url.searchParams.get('utm_content')  || undefined
    }
  });

  return res;
}

/**
 * Skip static assets + Next internals + API routes. Without this filter
 * we'd record a visit for every JS chunk, image, and favicon hit.
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|css|js|map)).*)'
  ]
};
