import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NukipaFeedback } from '@/components/NukipaFeedback';
import { getNukipaClient } from '@/lib/nukipa';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap'
});

// PLATFORM CONTRACT: `generateMetadata` MUST stay async and return
// `verification: { google: <token> }` when the gateway returns one,
// otherwise Google Search Console verification never advances. The
// fetch is best-effort and falls back to base metadata on failure.
const baseMetadata: Metadata = {
  title: {
    default: 'Airteam · Instant Roof Measurement',
    template: '%s · Airteam'
  },
  description:
    'Enter your address, trace your roof on a satellite view, and get instant measurements and a tailored offer.'
};

export async function generateMetadata(): Promise<Metadata> {
  let googleVerification: string | undefined;
  try {
    const client = await getNukipaClient();
    const tenant = await client.getTenant();
    const token = (tenant as { google_verification_token?: string | null } | null)
      ?.google_verification_token;
    if (token) googleVerification = token;
  } catch {
    /* gateway flaky? still render the page — meta tag is best-effort. */
  }
  return googleVerification
    ? { ...baseMetadata, verification: { google: googleVerification } }
    : baseMetadata;
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="bg-white text-ink antialiased">
        {children}
        {/* PLATFORM CONTRACT: keep <NukipaFeedback /> inside <body>. */}
        <NukipaFeedback />
      </body>
    </html>
  );
}
