import { getPageContentForRender } from "@/lib/cmsPreview";
import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/Hero";
import About from "@/components/About";
import FeaturedProjects from "@/components/FeaturedProjects";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import LatestWeddings from "@/components/LatestWeddings";
import StorySection from "@/components/StorySection";
import Process from "@/components/Process";
import Testimonials from "@/components/Testimonials";
import Clients from "@/components/Clients";
import Instagram from "@/components/Instagram";
import Contact from "@/components/Contact";
import {
  getCmsCategories,
  getPublishedPageContent,
  resolveAlbumById,
  resolvePickedSessions
} from "@/lib/api";
import { localizeContent, type HideableSection } from "@/lib/cms";
import { categories as fallbackCategories } from "@/lib/data";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCategories = await getTranslations({ locale, namespace: "categories" });

  /**
   * The page content and the category list do not depend on each other, so
   * they are fetched together. Awaited in sequence their latencies simply
   * added up, and `getCmsCategories` is itself several requests deep — on a
   * cold cache that was the bulk of the homepage's time to first byte.
   */
  const [pageContent, categoryItems] = await Promise.all([
    getPageContentForRender("home"),
    getCmsCategories(fallbackCategories, (id) => tCategories(id))
  ]);

  // Resolve every section to the language being viewed before rendering.
  const cms = localizeContent(pageContent?.content, locale);
  // Absent flags mean "visible", so a record saved before this feature existed
  // keeps rendering every section.
  const shows = (section: HideableSection) => !cms?.hiddenSections?.[section];

  // Resolved here rather than inside Gallery: that component is a client
  // component, and the session lookup needs the server-side API client. This
  // one genuinely depends on `cms`, so it cannot join the batch above.
  const galleryPicks = await resolvePickedSessions(cms?.gallery?.sessionIds ?? []);
  /**
   * Each picked session's own media, so opening a tile browses that project
   * rather than paging between unrelated covers. The listing endpoint omits
   * media, so this is one resolve per tile — bounded by the picker's own
   * ceiling, and cached alongside the rest of the page.
   */
  const galleryAlbums = await Promise.all(
    galleryPicks
      // A session whose cover has not been generated yet would render a broken
      // tile, so it is dropped rather than shown empty.
      .filter((album) => album.coverUrl)
      .map(async (album) => ({
        album,
        // Null for an album behind the gallery password: the backend serves no
        // media without it, and the tile falls back to showing its cover.
        resolved: album.category ? await resolveAlbumById(album.category, album.id) : null
      }))
  );

  const visibleCategoryIds = new Set(categoryItems.map((category) => category.id));

  const galleryTiles = galleryAlbums.map(({ album, resolved }) => ({
    imageUrl: album.coverUrl as string,
    title: album.title,
    // Categories carry a translation, so label the tile in the reader's
    // language rather than echoing the raw category id.
    category: tCategories(album.category),
    // A signed, already-sized backend URL — see `GalleryTile.signed`.
    signed: true,
    photos:
      resolved?.photos
        // An item with no still of any kind would be a blank slide, so it is
        // left out rather than shown as an empty frame.
        .filter((photo) => photo.url)
        .map((photo) => ({
          url: photo.url,
          type: photo.type,
          ...(photo.sourceUrl ? { sourceUrl: photo.sourceUrl } : {})
        })) ?? [],
    // Photos and videos together: the card is saying how much is in there.
    assetCount: album.photoCount + album.videoCount,
    /**
     * Only to a category the CMS still shows. An album in a hidden category has
     * no reachable page, so linking to it would offer a button that 404s.
     */
    ...(album.category && visibleCategoryIds.has(album.category)
      ? { href: `/category/${album.category}/${album.id}` }
      : {})
  }));

  return (
    <>
      <Hero content={cms?.hero} categoryItems={categoryItems} />
      {shows("latestWeddings") ? <LatestWeddings content={cms?.latestWeddings} /> : null}
      {shows("gallery") ? (
        <Gallery content={cms?.gallery} pickedItems={galleryTiles} />
      ) : null}
      {shows("about") ? <About content={cms?.about} /> : null}
      {shows("story") ? <StorySection content={cms?.story} /> : null}
      {shows("process") ? <Process content={cms?.process} /> : null}
      {shows("testimonials") ? <Testimonials content={cms?.testimonials} /> : null}
      {shows("clients") ? <Clients content={cms?.clients} /> : null}
      {shows("instagram") ? <Instagram content={cms?.instagram} /> : null}
      {shows("contact") ? <Contact content={cms?.contact} /> : null}
    </>
  );
}
