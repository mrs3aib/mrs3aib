import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Hosts the image optimizer is allowed to fetch from.
 *
 * This used to be `hostname: "**"`, which let any URL on the page be proxied
 * and re-encoded through the Node server. Signed storage URLs are now rendered
 * with `unoptimized`, since they arrive already sized and expire — optimizing
 * them only added a proxy hop and a cache that outlived the signature. What is
 * left is the placeholder imagery in `lib/data.ts` plus, when configured, the
 * backend's own origin for CMS assets it serves directly.
 */
const placeholderHosts = [
  "images.unsplash.com",
  "picsum.photos",
  "fastly.picsum.photos"
];

function apiHostPattern() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) return [];
  try {
    const { hostname, protocol } = new URL(base);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname
      }
    ];
  } catch {
    // A malformed base URL must not break the build; the site simply falls
    // back to placeholders, which are covered above.
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...placeholderHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname
      })),
      ...apiHostPattern()
    ]
  }
};

export default withNextIntl(nextConfig);
