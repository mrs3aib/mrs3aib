import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { categories, type CategoryId } from "@/lib/data";
import {
  fetchAlbumAccess,
  getCmsCategories,
  getPublishedPageContent,
  resolveAlbumById
} from "@/lib/api";
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

  // Titles are already visible in listings, but the description is part of the
  // album's contents — so a gated album contributes its name and nothing else.
  const access = await fetchAlbumAccess(albumId);
  if (access?.requiresPassword) return { title: access.title };

  const album = await resolveAlbumById(id as CategoryId, albumId);
  if (!album?.title) return {};

  return {
    title: album.title,
    description: album.description ?? undefined
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
    getPublishedPageContent(`category-${id}`),
    fetchAlbumAccess(albumId),
    getCmsCategories(categories, (categoryId) => tCategories(categoryId))
  ]);

  // A hidden category hides its albums too — otherwise a direct album URL is a
  // way around the CMS flag the category page already honours.
  if (pageContent?.content.pageHidden) notFound();
  if (!access) notFound();

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
