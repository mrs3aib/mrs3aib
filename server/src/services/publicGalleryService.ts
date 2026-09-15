import type { SessionCategory, SessionVisibility } from "@prisma/client";
import {
  readyVideoCountsBySession,
  sessionRepository
} from "@/repositories/sessionRepository";
import { mediaRepository } from "@/repositories/mediaRepository";
import { storageKeys } from "@/storage/storageKeys";
import { storageProvider } from "./serviceRegistry";
import { galleryService } from "./galleryService";
import { zipArchiveService } from "./zipArchiveService";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/types/errors";
import { gallerySettingsRepository } from "@/repositories/gallerySettingsRepository";
import { verifyPassword } from "@/auth/password";
import { youTubeThumbnailUrl } from "@/utils/youtube";

/**
 * Read-only gallery data for the public marketing site.
 *
 * Unlike `galleryService`, nothing here is scoped to a logged-in client: these
 * endpoints back the category pages that anonymous visitors browse. A session
 * is exposed only when the admin marked it `isPublic` *and* its status is
 * `active`, so an unpublished, draft, or archived session stays invisible even
 * if its id is guessed.
 */
/** One media row, reduced to what an album card needs to pick a cover. */
type CoverCandidate = {
  id: string;
  type: string;
  source: string;
  externalId: string | null;
  thumbnailKey: string | null;
  storageKey: string | null;
};

/**
 * The session shape both listing endpoints start from.
 *
 * `media` and `_count` arrive with the session itself rather than being read
 * back per album — see `PUBLIC_ALBUM_MEDIA_SELECT` in the repository.
 */
type ListedSession = {
  id: string;
  slug: string;
  title: string;
  category: SessionCategory;
  eventDate: Date;
  location: string;
  description: string | null;
  /** Media id the admin pinned as the cover, if any. */
  coverImage: string | null;
  /** Storage key of a cover uploaded for this session, if any. */
  coverStorageKey: string | null;
  /** Externally hosted cover, pasted rather than uploaded, if any. */
  coverImageExternalUrl: string | null;
  /**
   * Password settings, joined by the listing query. Only presence is used; the
   * hash is narrowed to a boolean here and never travels further.
   */
  gallerySettings: { passwordProtected: boolean; passwordHash: string | null } | null;
  /** Ready media for this session, already filtered by the query. */
  media: CoverCandidate[];
  /** Ready *image* count, computed by the database. */
  _count: { media: number };
};

/**
 * Whether this session's contents are behind the gallery password.
 *
 * A set password gates the album on its own. This previously also required
 * `visibility === "protected"`, but nothing keeps the two in step: the admin's
 * "Password protect gallery" toggle writes the gallery settings and never
 * touches `visibility`, so every album given a password through that switch
 * stayed fully open — the password was collected, hashed, and then ignored.
 *
 * `visibility` still decides how an album is *reached*: `private` keeps it out
 * of listings. What gates its contents is whether a password exists.
 */
async function isPasswordGated(
  sessionId: string,
  _visibility: SessionVisibility
): Promise<boolean> {
  const settings = await gallerySettingsRepository.findBySessionId(sessionId);
  return Boolean(settings?.passwordProtected && settings.passwordHash);
}

/**
 * Guard for the public download routes.
 *
 * Mirrors `downloadService.assertDownloadsAllowed`, which covers the logged-in
 * client routes. Anonymous visitors reach the files through this service
 * instead, so without the same check here the admin's "allow downloads" switch
 * governed only signed-in clients and did nothing on the public site.
 */
async function assertPublicDownloadsAllowed(sessionId: string): Promise<void> {
  await galleryService.assertGalleryAccessible(sessionId);
  const settings = await gallerySettingsRepository.findBySessionId(sessionId);
  if (settings && !settings.allowDownloads) {
    throw new ForbiddenError("Downloads are disabled for this gallery");
  }
}

/**
 * Turn a session row into the album summary the site renders.
 *
 * Shared by the per-category listing and the cross-category one so the two can
 * never drift — a field added for one page appears on both.
 */
async function toAlbumSummary(session: ListedSession, videoCount: number) {
  const ready = session.media;
  /**
   * A cover set for this session wins outright — it exists so the card need not
   * be a frame of the album's own media, and it is always a still, so the card
   * renders as an image rather than a player. Only when none is set do the
   * pinned item and the automatic pick apply.
   */
  const chosenCoverUrl = session.coverStorageKey
    ? await storageProvider.getDownloadUrl(session.coverStorageKey)
    : // A pasted URL is someone else's file: served exactly as given, never
      // signed. Upload wins when both are somehow set.
      session.coverImageExternalUrl;

  // The admin's pinned cover wins, and it may be a video. Only when nothing is
  // pinned (or the pinned item was since deleted) does the automatic pick apply.
  const pinned = session.coverImage
    ? ready.find((m) => m.id === session.coverImage)
    : undefined;
  const cover =
    pinned ??
    ready.find((m) => m.type === "image" && m.thumbnailKey) ??
    ready.find((m) => m.thumbnailKey) ??
    // A ready upload normally has a thumbnail, but the original is still a
    // valid cover if an older import has none. Never publish an empty `src`.
    ready.find((m) => m.type === "image" && m.storageKey) ??
    ready.find((m) => m.storageKey);

  // Both URLs are signed against the same provider and neither depends on the
  // other, so they are signed together rather than one after the next.
  const [coverUrl, coverVideoUrl] = await Promise.all([
    cover?.source === "youtube"
      ? Promise.resolve(
          cover.externalId ? youTubeThumbnailUrl(cover.externalId) : null
        )
      : cover?.thumbnailKey ?? cover?.storageKey
        ? storageProvider.getDownloadUrl(cover.thumbnailKey ?? cover.storageKey!)
        : Promise.resolve(null),
    cover?.type === "video" && cover.storageKey
      ? storageProvider.getDownloadUrl(cover.storageKey)
      : Promise.resolve(null)
  ]);

  /**
   * Whether opening this album will ask for a password. Public on purpose: the
   * card uses it to prompt in place rather than sending a visitor to a page
   * that only turns them away. It says a password is needed, never what it is.
   */
  const requiresPassword = Boolean(
    session.gallerySettings?.passwordProtected && session.gallerySettings.passwordHash
  );

  return {
    id: session.id,
    slug: session.slug,
    title: session.title,
    requiresPassword,
    category: session.category,
    eventDate: session.eventDate.toISOString(),
    location: session.location,
    description: session.description,
    photoCount: session._count.media,
    videoCount,
    /**
     * Which media item the cover actually is — the pinned one, or the same
     * automatic pick made above. The site opens this item when a visitor
     * clicks the cover, which is only correct if it names the item shown.
     */
    coverImage: cover?.id ?? null,
    // A linked video's still is public on YouTube's CDN; ours must be signed.
    coverUrl: chosenCoverUrl ?? coverUrl,
    /**
     * "video" tells the site to render a player rather than a still. A cover
     * set for the session is always a still, so it forces "image" — otherwise a
     * card whose album happens to pin a video would show a play button over a
     * picture that cannot play.
     */
    coverType: chosenCoverUrl ? "image" : (cover?.type ?? null),
    /**
     * Playable source for a video cover. `coverUrl` stays the poster frame, so
     * the site has something to show before playback starts. A linked video has
     * no such file — the card falls back to showing its still, and the video
     * itself plays from the embed inside the album.
     *
     * Suppressed entirely when the session has its own cover: the card shows
     * that still, not a frame of any video, so there is nothing to play.
     */
    coverVideoUrl: chosenCoverUrl ? null : coverVideoUrl
  };
}

/**
 * Summarise a page of sessions, resolving every album's video count in one
 * grouped query instead of one query per album.
 */
async function toAlbumSummaries(sessions: ListedSession[]) {
  const videoCounts = await readyVideoCountsBySession(sessions.map((s) => s.id));
  return Promise.all(
    sessions.map((session) =>
      toAlbumSummary(session, videoCounts.get(session.id) ?? 0)
    )
  );
}

/** Upper bound on one `listPublic` page, so a huge portfolio cannot be pulled at once. */
const PUBLIC_SESSION_LIST_MAX = 60;

export const publicGalleryService = {
  /** Album summaries for one category page. */
  async listByCategory(category: SessionCategory) {
    const sessions = await sessionRepository.listPublicByCategory(
      category,
      PUBLIC_SESSION_LIST_MAX
    );
    return toAlbumSummaries(sessions);
  },

  /**
   * Published sessions across every category, newest first.
   *
   * Backs the CMS picker and the homepage's auto-filled feature sections, which
   * both need the portfolio as one list rather than per category.
   */
  async listPublic(args: {
    category?: SessionCategory | undefined;
    limit?: number | undefined;
  }) {
    const take = Math.min(
      Math.max(args.limit ?? PUBLIC_SESSION_LIST_MAX, 1),
      PUBLIC_SESSION_LIST_MAX
    );
    const sessions = await sessionRepository.listPublic({
      category: args.category,
      take
    });
    return toAlbumSummaries(sessions);
  },

  /** Full contents of one public session. */
  /**
   * Whether an album needs a password before its contents can be read.
   *
   * Answers the album page's first question without revealing anything: it
   * reports only the title and that a password is required, never the media.
   */
  /**
   * A freshly signed URL for the session's cover, or null when there is none.
   *
   * Reuses the same cover choice the listing makes — a session cover if the
   * admin set one, otherwise the pinned or automatically picked item — so a
   * link preview shows the same image as the card the visitor clicked.
   */
  async getCoverUrl(sessionId: string): Promise<string | null> {
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) return null;

    if (session.coverStorageKey) {
      return storageProvider.getDownloadUrl(session.coverStorageKey);
    }
    if (session.coverImageExternalUrl) return session.coverImageExternalUrl;

    const media = await mediaRepository.findAllForSession(sessionId);
    const ready = media.filter((m) => m.processingStatus === "ready");
    const pinned = session.coverImage
      ? ready.find((m) => m.id === session.coverImage)
      : undefined;
    // Prefer the optimized derivative: it is the large, well-compressed copy,
    // which is what a preview card wants — the thumbnail caps at 480px and
    // reads as a small icon rather than a banner.
    const cover =
      pinned ??
      ready.find((m) => m.type === "image" && m.storageKey) ??
      ready.find((m) => m.thumbnailKey);
    if (!cover) return null;

    const key =
      cover.type === "image" && cover.storageKey
        ? storageKeys.optimized(sessionId, cover.id)
        : (cover.thumbnailKey ?? cover.storageKey);
    return key ? storageProvider.getDownloadUrl(key) : null;
  },

  async getPublicGalleryAccess(sessionId: string) {
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) throw new NotFoundError("Gallery not found");

    return {
      sessionId,
      title: session.title,
      /**
       * The category this session really belongs to.
       *
       * The album route carries a category in its path but nothing verified it
       * against the session, so any album rendered under any category id —
       * mislabelled on screen and in its own share link. Returned here rather
       * than only on the gallery payload because this call already runs first
       * and costs nothing extra, so the page can reject a mismatched URL
       * before fetching any media.
       */
      category: session.category,
      requiresPassword: await isPasswordGated(sessionId, session.visibility)
    };
  },

  async getPublicGallery(sessionId: string, password?: string, limit?: number) {
    // Only the published check is needed here — `getGallery` re-reads the
    // session and enforces expiry itself, so repeating either would cost two
    // extra round trips to a remote database for no added protection.
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) throw new NotFoundError("Gallery not found");

    if (await isPasswordGated(sessionId, session.visibility)) {
      const settings = await gallerySettingsRepository.findBySessionId(sessionId);
      // `isPasswordGated` already established the hash exists; this narrows it.
      const hash = settings?.passwordHash;
      if (!hash) throw new UnauthorizedError("Gallery password required");
      if (!password || !(await verifyPassword(password, hash))) {
        throw new UnauthorizedError("Gallery password required");
      }
    }

    return galleryService.getGallery(sessionId, limit);
  },

  /** Signed URL for one original file in a public session. */
  async getDownloadUrl(sessionId: string, mediaId: string): Promise<string> {
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) throw new NotFoundError("Gallery not found");
    await assertPublicDownloadsAllowed(sessionId);

    const media = await mediaRepository.findById(mediaId);
    if (!media || media.sessionId !== sessionId) {
      throw new NotFoundError("Media not found");
    }
    // Linked videos are watched on YouTube; there is no file to hand over.
    if (!media.storageKey) {
      throw new NotFoundError("Media not found");
    }

    return storageProvider.getDownloadUrl(
      media.storageKey,
      undefined,
      media.originalName
    );
  },

  /** Signed URL for the whole folder as one ZIP. */
  async getFolderZipUrl(sessionId: string): Promise<string> {
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) throw new NotFoundError("Gallery not found");
    await assertPublicDownloadsAllowed(sessionId);

    return zipArchiveService.getOrCreateSessionZipUrl(sessionId);
  },

  /**
   * Signed URL for a chosen subset of a public session, as one ZIP.
   *
   * Without this the site had to sign and fetch each pick separately, and
   * browsers throttle or block a burst of downloads from one gesture — a
   * visitor selecting a few dozen photos reliably received only the first
   * handful. `getOrCreateSelectionZipUrl` rejects ids from another gallery,
   * so a caller cannot use this to reach media it was not shown.
   */
  async getSelectionZipUrl(
    sessionId: string,
    mediaIds: string[]
  ): Promise<string> {
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) throw new NotFoundError("Gallery not found");
    await assertPublicDownloadsAllowed(sessionId);

    return zipArchiveService.getOrCreateSelectionZipUrl(sessionId, mediaIds);
  }
};
