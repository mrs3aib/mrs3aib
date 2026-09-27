import type { MetadataRoute } from "next";
import { categories } from "@/lib/data";
import { getCmsCategories } from "@/lib/api";

/**
 * Public, stable pages only. Individual galleries are intentionally omitted:
 * their visibility can change in the CMS and password-protected albums must
 * never be advertised to crawlers.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) return [];

  const locales = ["ar", "en"] as const;
  // Uses the same visibility rules as the public navigation, so a hidden CMS
  // category stops being advertised in search without a manual sitemap edit.
  const visibleCategories = await getCmsCategories(categories, (id) => id);
  const entries: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    {
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/${locale}/extra-services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    ...visibleCategories.map((category) => ({
      url: `${siteUrl}/${locale}/category/${category.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ]);

  return entries;
}
