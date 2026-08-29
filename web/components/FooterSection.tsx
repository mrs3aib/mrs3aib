import { getPageContentForRender } from "@/lib/cmsPreview";
import { getLocale } from "next-intl/server";
import Footer from "./Footer";
import {
  getPublishedPageContent
} from "@/lib/api";
import { footerTextFor } from "@/lib/cms";

/**
 * Server wrapper that feeds the footer its CMS content.
 *
 * The footer renders from the root layout rather than a page, so it cannot be
 * handed a `content` prop the way the homepage sections are — it fetches its
 * own record instead. `footer` is its own page key because the footer is
 * site-wide, not homepage-specific.
 *
 * The per-locale text is resolved here rather than in the client component, so
 * only the strings this request needs cross the boundary.
 */
export default async function FooterSection() {
  const [page, locale] = await Promise.all([
    getPageContentForRender("footer"),
    getLocale()
  ]);
  const footer = page?.content?.footer;

  return (
    <Footer
      content={{
        ...footerTextFor(footer, locale),
        phone: footer?.phone,
        email: footer?.email,
        social: footer?.social
      }}
    />
  );
}
