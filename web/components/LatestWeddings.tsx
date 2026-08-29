import {
  listPublicSessions,
  resolvePickedSessions,
  toListedPublicAlbum
} from "@/lib/api";
import {
  LATEST_WEDDINGS_DEFAULT_COUNT,
  WEDDINGS_CATEGORY_ID,
  type HomepageCmsContent
} from "@/lib/cms";
import LatestWeddingsClient from "./LatestWeddingsClient";

/**
 * The weddings showcase directly below the hero.
 *
 * In "auto" mode it lists the newest published wedding sessions and needs no
 * upkeep. In "manual" mode it renders exactly the sessions the admin picked, in
 * their order, silently dropping any that are no longer published.
 */
export default async function LatestWeddings({
  content
}: {
  content?: HomepageCmsContent["latestWeddings"];
}) {
  const count = content?.count ?? LATEST_WEDDINGS_DEFAULT_COUNT;
  const mode = content?.mode ?? "auto";
  const pickedIds = content?.sessionIds ?? [];

  const albums =
    mode === "manual" && pickedIds.length > 0
      ? await resolvePickedSessions(pickedIds)
      : await listPublicSessions({ category: WEDDINGS_CATEGORY_ID, limit: count });

  // Manual mode renders every pick; auto mode is capped by the chosen count.
  const live = mode === "manual" ? albums : albums.slice(0, count);
  /**
   * No published weddings means no section. It previously fell back to demo
   * albums, which put stock photography on the homepage as though it were the
   * studio's most recent work.
   */
  const resolvedAlbums = live.map((album, index) =>
    toListedPublicAlbum(WEDDINGS_CATEGORY_ID, album, index)
  );

  if (resolvedAlbums.length === 0) return null;

  return <LatestWeddingsClient albums={resolvedAlbums} content={content} />;
}
