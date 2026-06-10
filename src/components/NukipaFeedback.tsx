// Mounts the floating feedback widget. Server component - renders a
// single <script> tag pointing at /nukipa-widget.js (a vanilla JS
// file in /public). The actual UI lives outside React, inside a
// closed Shadow DOM, so:
//
//   - The design agents can rewrite layout.tsx / components / Tailwind
//     freely without breaking or restyling the widget.
//   - The widget re-mounts itself if anything removes its host element
//     (see the MutationObserver in /public/nukipa-widget.js).
//
// Feedback collects in localStorage on the tenant's machine. There is
// no backend round-trip - the tenant presses "Copy all" to grab a
// markdown summary they paste into the designer's chat.
//
// Default behaviour: shown in production builds (deployed preview the
// tenant reviews), hidden during local `npm run dev` (the agent is
// driving the browser there - the widget would be noise in screenshots).
//
// Configuration:
//   NUKIPA_FEEDBACK_DISABLED=1   force-hide even in production (e.g.
//                                once the tenant approves go-live)
//   NUKIPA_FEEDBACK_ENABLED=1    force-show in development (e.g. when
//                                testing the widget itself locally)

import Script from 'next/script';

export function NukipaFeedback() {
  if (process.env.NUKIPA_FEEDBACK_DISABLED === '1') return null;

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && process.env.NUKIPA_FEEDBACK_ENABLED !== '1') return null;

  const tenantHost = process.env.NUKIPA_TENANT_HOST || '';

  return (
    <Script
      id="nukipa-feedback-widget"
      src="/nukipa-widget.js"
      strategy="afterInteractive"
      data-tenant={tenantHost}
      data-label="Feedback"
    />
  );
}
