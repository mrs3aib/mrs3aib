import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { categories, type CategoryId } from "@/lib/data";
import {
  fetchAlbumAccess,
  getCmsCategories,
  resolveAlbumById
} from "@/lib/api";
import { getPageContentForRender } from "@/lib/cmsPreview";
import { redirect } from "@/i18n/navigation";
import AlbumView from "@/components/AlbumView";
import AlbumPasswordGate from "@/components/AlbumPasswordGate";

function isKnownCategory(id: string) {
  return (categories as readonly string[]).includes(id);
}

/**
 * Albums are published and unpublished from the CMS at any time, so this route
 * is rendered on demand rather than baked at build time. The category pages
 * that link here are still statically generated.
 *
 * Rendered on demand, but no longer `force-dynamic`: that opted the route out
 * of caching entirely, so every view re-fetched the session and re-signed every
 * item. The fetches underneath now carry their own cache policy — the gallery
 * payload expires with the signed URLs it embeds — which bounds reuse
 * correctly instead of disabling it.
 */

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; id: string; albumId: string }>;
}): Promise<Metadata> {
  const { id, albumId } = await params;
  if (!isKnownCategory(id)) return {};

  /**
   * A hidden category 404s its albums too, and metadata runs before that
   * `notFound()` — so without this the not-found page was served carrying the
   * album's real title.
   */
  const categoryPage = await getPageContentForRender(`category-${id}`);
  if (categoryPage?.content.pageHidden) return {};

  // Titles are already visible in listings, but the description is part of the
  // album's contents — so a gated album contributes its name and nothing else.
  const access = await fetchAlbumAccess(albumId);
  // An album reached under the wrong category renders a 404, which must not
  // carry the album's real title — same reasoning as the hidden check above.
  if (access && access.category !== id) return {};
  if (access?.requiresPassword) return { title: access.title };

  const album = await resolveAlbumById(id as CategoryId, albumId);
  if (!album?.title) return {};

  const description = album.description ?? undefined;

  /**
   * A permanent address for the cover, not the signed URL the page renders.
   *
   * Storage signatures live ten minutes. A crawler fetches `og:image` whenever
   * the link is first shared — often hours later — and was met with
   * `ExpiredRequest`, so WhatsApp rendered the card with no image. This
   * endpoint signs on demand and redirects, so the metadata can name a URL
   * that never goes stale.
   */
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
  const image =
    apiBase && album.coverUrl
      ? `${apiBase}/public/sessions/${albumId}/cover`
      : undefined;

  return {
    title: album.title,
    description,
    openGraph: {
      title: album.title,
      description,
      type: "website",
      ...(image
        ? {
            images: [
              {
                url: image,
                /**
                 * Declared so the crawler can pick the large card without
                 * downloading and measuring the file first. WhatsApp falls
                 * back to the small thumbnail layout when it cannot establish
                 * that the image clears its size threshold.
                 */
                width: 1200,
                height: 630,
                alt: album.title
              }
            ]
          }
        : {})
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: album.title,
      description,
      ...(image ? { images: [image] } : {})
    }
  };
}

export default async function AlbumPage({
  params
}: {
  params: Promise<{ locale: string; id: string; albumId: string }>;
}) {
  const { locale, id, albumId } = await params;
  setRequestLocale(locale);

  if (!isKnownCategory(id)) notFound();

  const tCategories = await getTranslations({ locale, namespace: "categories" });

  /**
   * None of these depend on each other, so they go out together. Awaited in
   * sequence the album view paid all three latencies back to back, and
   * `getCmsCategories` is itself several requests deep.
   */
  const [pageContent, access, categoryItems] = await Promise.all([
    getPageContentForRender(`category-${id}`),
    fetchAlbumAccess(albumId),
    getCmsCategories(categories, (categoryId) => tCategories(categoryId))
  ]);

  // A hidden category hides its albums too — otherwise a direct album URL is a
  // way around the CMS flag the category page already honours.
  if (pageContent?.content.pageHidden) notFound();
  if (!access) notFound();

  /**
   * The category in the URL must be the album's own.
   *
   * Nothing verified this before: the access and gallery endpoints are keyed on
   * session id alone, and `resolveAlbumById` takes the category as a label and
   * stamps it onto the album. So every album rendered under all eight category
   * paths — each returning 200, each showing the wrong category on screen, and
   * each baking the wrong path into the share and QR link the visitor copies.
   *
   * Redirected rather than 404'd: these URLs have been live and shareable, so
   * an already-circulated wrong link lands on the right page instead of a dead
   * end, and search engines collapse the duplicates onto one canonical path.
   */
  if (access.category !== id) {
    // The locale-aware `redirect`: `localePrefix` defaults to "always", so a
    // bare next/navigation redirect would drop the prefix and bounce an
    // English visitor onto the Arabic default.
    redirect({ href: `/category/${access.category}/${albumId}`, locale });
  }

  const categoryLabel =
    categoryItems.find((category) => category.id === id)?.label ??
    tCategories(id as CategoryId);

  /**
   * A gated album stops here: the media is never fetched on the server, so the
   * page cannot ship contents the visitor has not unlocked. The client asks
   * `/unlock` for them once the password is accepted.
   */
  if (access.requiresPassword) {
    return (
      <AlbumPasswordGate
        category={id as CategoryId}
        albumId={albumId}
        title={access.title}
        categoryLabel={categoryLabel}
        backHref={`/category/${id}`}
      />
    );
  }

  const album = await resolveAlbumById(id as CategoryId, albumId);
  if (!album) notFound();

  return (
    <AlbumView
      album={album}
      categoryLabel={categoryLabel}
      variant="page"
      backHref={`/category/${id}`}
    />
  );
}
