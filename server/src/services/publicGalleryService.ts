import type { SessionCategory, SessionVisibility } from "@prisma/client";
import {
  readyVideoCountsBySession,
  sessionRepository
} from "@/repositories/sessionRepository";
import { mediaRepository } from "@/repositories/mediaRepository";
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
  /** Ready media for this session, already filtered by the query. */
  media: CoverCandidate[];
  /** Ready *image* count, computed by the database. */
  _count: { media: number };
};

/**
 * Whether this session's contents are behind the gallery password.
 *
 * Both halves must hold: the admin marked the album `protected` *and* a
 * password is actually set. A `protected` album with no password would
 * otherwise be permanently unopenable, since there would be nothing to match.
 */
async function isPasswordGated(
  sessionId: string,
  visibility: SessionVisibility
): Promise<boolean> {
  if (visibility !== "protected") return false;
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
  // The admin's pinned cover wins, and it may be a video. Only when nothing is
  // pinned (or the pinned item was since deleted) does the automatic pick apply.
  const pinned = session.coverImage
    ? ready.find((m) => m.id === session.coverImage)
    : undefined;
  const cover =
    pinned ??
    ready.find((m) => m.type === "image" && m.thumbnailKey) ??
    ready.find((m) => m.thumbnailKey);

  // Both URLs are signed against the same provider and neither depends on the
  // other, so they are signed together rather than one after the next.
  const [coverUrl, coverVideoUrl] = await Promise.all([
    cover?.source === "youtube"
      ? Promise.resolve(
          cover.externalId ? youTubeThumbnailUrl(cover.externalId) : null
        )
      : cover?.thumbnailKey
        ? storageProvider.getDownloadUrl(cover.thumbnailKey)
        : Promise.resolve(null),
    cover?.type === "video" && cover.storageKey
      ? storageProvider.getDownloadUrl(cover.storageKey)
      : Promise.resolve(null)
  ]);

  return {
    id: session.id,
    slug: session.slug,
    title: session.title,
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
    coverUrl,
    /** "video" tells the site to render a player rather than a still. */
    coverType: cover?.type ?? null,
    /**
     * Playable source for a video cover. `coverUrl` stays the poster frame, so
     * the site has something to show before playback starts. A linked video has
     * no such file — the card falls back to showing its still, and the video
     * itself plays from the embed inside the album.
     */
    coverVideoUrl
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
    const sessions = await sessionRepository.listPublicByCategory(category);
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
  async getPublicGalleryAccess(sessionId: string) {
    const session = await sessionRepository.findPublicById(sessionId);
    if (!session) throw new NotFoundError("Gallery not found");

    return {
      sessionId,
      title: session.title,
      requiresPassword: await isPasswordGated(sessionId, session.visibility)
    };
  },

  async getPublicGallery(sessionId: string, password?: string) {
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

    return galleryService.getGallery(sessionId);
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
