import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ExtraServicesDetail from "@/components/ExtraServicesDetail";
import { getPageContentForRender } from "@/lib/cmsPreview";
import { EXTRA_SERVICES_PAGE_KEY, extraServicesTextFor } from "@/lib/cms";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "extraServicesPage" });
  const page = await getPublishedContent();
  const text = extraServicesTextFor(page?.extraServices, locale);

  // The admin's title and subtitle are what a visitor reads, so they are also
  // what a search result and a shared link should show.
  return {
    title: text.title || t("title"),
    description: text.subtitle || t("subtitle")
  };
}

/**
 * The page's CMS content, or undefined when unpublished or absent.
 *
 * `published: false` is read as "use the built-in copy", matching the toggle's
 * description in the admin panel — the page keeps rendering either way.
 */
async function getPublishedContent() {
  const page = await getPageContentForRender(EXTRA_SERVICES_PAGE_KEY);
  if (!page?.published) return undefined;
  return page.content;
}

export default async function ExtraServicesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = await getPublishedContent();

  return (
    <ExtraServicesDetail
      content={content?.extraServices}
      hero={content?.hero}
      locale={locale}
    />
  );
}
