import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    /**
     * Any host. CMS images can be pasted from anywhere the admin hosts them,
     * so there is no fixed list to allow.
     *
     * The exposure this would normally carry — arbitrary URLs proxied and
     * re-encoded through the Node server — is limited by the call sites rather
     * than here: every remote image on the site renders with `unoptimized`,
     * because signed storage URLs arrive already sized and expire, and
     * optimizing them only added a proxy hop and a cache that outlived the
     * signature. The optimizer is therefore not in the path for them at all.
     */
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ]
  }
};

export default withNextIntl(nextConfig);
