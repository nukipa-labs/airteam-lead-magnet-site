import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This project lives next to other lockfiles in the parent folder during
  // development; pin the tracing root so Next doesn't infer the wrong one.
  outputFileTracingRoot: here,
  // Tenants serve images from their own assets, the Nukipa storage bucket,
  // and the customer's existing CDN (logos/OG images sometimes hot-link
  // during the first pass). Add specific allow-listed remotePatterns
  // before going live in production.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
};

export default nextConfig;
