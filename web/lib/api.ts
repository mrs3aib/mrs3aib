/**
 * Backend client for the public site.
 *
 * Anonymous browsing is served by the `/public/*` routes, which expose only
 * sessions an admin published (`isPublic`). When the API is absent,
 * unreachable, or has nothing published for a category, the affected section
 * renders empty rather than erroring — and rather than substituting demo
 * albums, which on a live site advertised work the studio never did.
 */
import type { Album, CategoryId } from "./data";
import type { CmsCategory, HomepageCmsContent, PageContentPayload } from "./cms";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** How long a successful response is reused before refetching (seconds). */
const REVALIDATE_SECONDS = 3600;

/**
 * Cache tag for everything the CMS can change, so a save can drop exactly that
 * content rather than waiting out the hour or clearing the whole cache.
 * `/api/revalidate` on this app purges it when the backend reports a change.
 */
export const CMS_CACHE_TAG = "cms";

/**
 * Ceiling for any response that embeds a signed storage URL.
 *
 * Those URLs expire ten minutes after the backend mints them, so caching the
 * response for the full hour would hand later visitors links that 403. Five
 * minutes keeps a comfortable margin while still absorbing the repeat views
 * that follow one visitor around the site.
 */
const SIGNED_URL_REVALIDATE_SECONDS = 300;

/**
 * How a response may be reused.
 *
 * - `cms`    — admin-editable content. Cached for an hour and purged on save
 *              via `CMS_CACHE_TAG`, so an edit still appears immediately.
 * - `signed` — carries signed storage URLs, so it expires with them.
 * - `never`  — a one-shot URL minted for this click; caching it would hand the
 *              next visitor a link that is already spent.
 *
 * Everything was previously either `no-store` or a flat hour, which made the
 * homepage re-fetch a dozen times per visit while album pages risked serving
 * expired links.
 */
type CachePolicy = "cms" | "signed" | "never";

/** Give up quickly — a slow API must not stall a static page build. */
const FETCH_TIMEOUT_MS = 4000;

/**
 * Budget for a fetch a visitor is actively waiting on, such as opening an
 * album. Signing every item's URL makes a large gallery legitimately slow, and
 * a session with a few dozen items sits close enough to the build-time budget
 * above that it aborted intermittently — which `safeGet` reports as "no data",
 * leaving the grid empty next to a correct photo count. Waiting is better than
 * silently showing nothing.
 */
const INTERACTIVE_FETCH_TIMEOUT_MS = 20000;

export type GalleryMedia = {
  id: string;
  type: "image" | "video";
  /** "youtube" items are embedded players, not files we host. */
  source?: "upload" | "youtube";
  /** YouTube video id, present only when `source` is "youtube". */
  externalId?: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  /** Signed, time-limited URL. Null if the item has no thumbnail yet. */
  thumbnailUrl: string | null;
  /** Signed URL for the original file — what the lightbox views and videos play. */
  sourceUrl?: string | null;
};

/** One published session as listed on a category page. */
export type PublicAlbum = {
  id: string;
  slug: string;
  title: string;
  category: CategoryId;
  eventDate: string;
  location: string;
  description: string | null;
  photoCount: number;
  videoCount: number;
  coverUrl: string | null;
  /** "video" when the pinned cover is a video, so the card shows a player. */
  coverType?: "image" | "video" | null;
  /** Playable source for a video cover; `coverUrl` stays the poster frame. */
  coverVideoUrl?: string | null;
  /** Media id the cover image belongs to, so clicking it opens that item. */
  coverImage?: string | null;
};

export type GalleryPayload = {
  session: {
    id: string;
    title: string;
    eventDate: string;
    location: string;
    description: string | null;
    /** Media id pinned as the cover, so the preview can open that exact item. */
    coverImage?: string | null;
  };
  settings?: {
    allowDownloads?: boolean;
    watermarkPreviewImages: boolean;
    watermarkUrl: string | null;
  };
  media: GalleryMedia[];
};

/**
 * A photo ready to render: either a signed backend URL or a placeholder.
 * `seed` is kept so callers can still build alternate sizes for placeholders.
 */
export type ResolvedPhoto = {
  key: string;
  url: string;
  /** Videos render the same poster thumbnail but download the source file. */
  type: "image" | "video";
  /**
   * Signed URL for the original file. The lightbox views images at full size
   * from here, and videos cannot play without it.
   */
  sourceUrl?: string;
  /**
   * YouTube video id when this item is a linked video. The grid shows YouTube's
   * still and the lightbox embeds a player, so no file of ours is involved.
   */
  youTubeId?: string;
  /** Present only for placeholder photos, where sizes are generated on demand. */
  seed?: string;
  isPlaceholder: boolean;
};

export type ResolvedAlbum = Album & {
  /** True when the contents came from the backend rather than `lib/data.ts`. */
  isLive: boolean;
  /** Backend session id, present only for live albums. Needed for ZIP download. */
  sessionId?: string;
  /**
   * Category this album belongs to. Together with `id` it forms the album's
   * canonical route, which is what share links and the QR code point at — the
   * modal has no URL of its own to borrow.
   */
  category?: CategoryId;
  /**
   * Real session title. Absent for placeholder albums, whose titles come from
   * the translation files keyed by album id.
   */
  title?: string;
  description?: string | null;
  /** Image count supplied by the session listing, available before the modal loads media. */
  photoCount: number;
  photos: ResolvedPhoto[];
  coverUrl: string;
  /** "video" when the admin pinned a video as the cover. */
  coverType?: "image" | "video";
  /**
   * Key of the photo the cover image shows, when the admin pinned one. The
   * preview opens this item rather than assuming the cover is the first in the
   * album — a pinned cover is frequently neither first nor even an image.
   */
  coverKey?: string;
  /** Playable source for a video cover; `coverUrl` is its poster frame. */
  coverVideoUrl?: string;
  /** Optional overlay configured for this session's preview images. */
  watermarkUrl?: string;
  /**
   * Whether the gallery offers downloads. False hides the controls; the server
   * refuses the request regardless, so this is presentation, not the guard.
   */
  allowDownloads?: boolean;
};

function isConfigured(): boolean {
  return API_BASE.length > 0;
}

/**
 * Fetch JSON, returning null on any failure — unreachable host, non-2xx,
 * timeout, or malformed body. Callers fall back rather than propagate.
 */
function cacheOptionsFor(policy: CachePolicy): RequestInit {
  switch (policy) {
    case "never":
      return { cache: "no-store" };
    case "signed":
      return { next: { revalidate: SIGNED_URL_REVALIDATE_SECONDS } };
    case "cms":
      return { next: { revalidate: REVALIDATE_SECONDS, tags: [CMS_CACHE_TAG] } };
  }
}

async function safeGet<T>(
  path: string,
  options: { policy?: CachePolicy; interactive?: boolean } = {}
): Promise<T | null> {
  if (!isConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.interactive ? INTERACTIVE_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS
  );

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      ...cacheOptionsFor(options.policy ?? "cms")
    });
    if (!res.ok) {
      warn(path, `HTTP ${res.status}`);
      return null;
    }
    /**
     * 204 is the CMS saying "nothing authored for this page yet" — the normal
     * state for a page the admin has not filled in, not a failure. It carries
     * no body, so parsing it as JSON throws "Unexpected end of JSON input";
     * that used to be caught below and logged as an error, which buried real
     * failures under noise on every cold start.
     */
    if (res.status === 204) return null;
    return (await res.json()) as T;
  } catch (error) {
    // Network error, timeout, or invalid JSON — treat all as "no data".
    warn(path, error instanceof Error ? error.message : String(error));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Report a failed backend call on the server only.
 *
 * Falling back to placeholders is deliberate — the site must never show an
 * error — but silently is how a misconfigured deployment looks identical to a
 * working one. Logging server-side puts the reason in the deploy logs without
 * changing what a visitor sees. The browser is left alone so a visitor's
 * console stays clean.
 */
function warn(path: string, reason: string): void {
  if (typeof window !== "undefined") return;
  console.warn(`[api] ${path} failed: ${reason} (falling back to placeholders)`);
}

/**
 * Convert one backend media item into the shape the gallery renders.
 *
 * Shared by every caller so a linked video is recognised identically wherever
 * media is resolved — miss it in one place and that view silently renders the
 * embed as an unplayable file.
 */
function toResolvedPhoto(m: GalleryMedia): ResolvedPhoto {
  const youTubeId = m.source === "youtube" ? (m.externalId ?? undefined) : undefined;
  return {
    key: m.id,
    url: (m.thumbnailUrl ?? m.sourceUrl) as string,
    type: m.type,
    ...(m.sourceUrl ? { sourceUrl: m.sourceUrl } : {}),
    ...(youTubeId ? { youTubeId } : {}),
    isPlaceholder: false
  };
}

/**
 * Turn a published session into a renderable album.
 *
 * The session's own media replaces the placeholder seeds entirely; `base` only
 * supplies the shape (id, seeds) that components still expect.
 */
function toLiveAlbum(base: Album, summary: PublicAlbum): ResolvedAlbum {
  return {
    ...base,
    id: summary.id,
    isLive: true,
    sessionId: summary.id,
    category: summary.category,
    title: summary.title,
    description: summary.description,
    photoCount: summary.photoCount,
    photos: [],
    // Empty rather than a seeded stock image when the cover has not been
    // generated yet — the card renders without one instead of showing a photo
    // the studio never took.
    coverUrl: summary.coverUrl ?? "",
    coverType: summary.coverType ?? "image",
    coverVideoUrl: summary.coverVideoUrl ?? undefined,
    ...(summary.coverImage ? { coverKey: summary.coverImage } : {}),
    videoCount: summary.videoCount,
    location: summary.location,
    date: summary.eventDate
  };
}

/**
 * Convert a listed public session into the album shape used by cards and modals.
 *
 * The listing endpoint does not include the full media array, so `photos` stays
 * empty; the album's own page loads the media server-side.
 */
export function toListedPublicAlbum(
  category: CategoryId,
  summary: PublicAlbum,
  index = 0
): ResolvedAlbum {
  // Every rendered value comes from the session itself; this only supplies the
  // structural fields the components still expect.
  return toLiveAlbum(buildFallbackShape(category, index), summary);
}

/**
 * Which rendered photo the cover image is showing.
 *
 * The admin's pinned cover wins; failing that it is whatever the backend would
 * have picked automatically — the first still, or the first item of any kind.
 * Returns undefined when nothing matches, and the caller then omits the key
 * rather than pointing at an item that is not in the grid.
 */
function coverKeyFrom(
  payload: GalleryPayload | null,
  photos: ResolvedPhoto[]
): string | undefined {
  const pinned = payload?.session.coverImage;
  if (pinned && photos.some((p) => p.key === pinned)) return pinned;
  return (photos.find((p) => p.type === "image") ?? photos[0])?.key;
}

/**
 * Albums shown on a category page.
 *
 * Only real published sessions. A category with nothing published renders as
 * empty — the demo albums that used to stand in here were indistinguishable
 * from real work to a visitor, which is misleading on a live portfolio: they
 * advertised shoots that never happened, and clicking one opened a gallery of
 * stock photography under the studio's name.
 */
export async function resolveCategoryAlbums(
  category: CategoryId
): Promise<ResolvedAlbum[]> {
  const payload = await safeGet<{ albums: PublicAlbum[] }>(
    `/public/categories/${category}/albums`,
    // Cover URLs are signed, so this expires with them.
    { policy: "signed" }
  );

  return (payload?.albums ?? []).map((summary, index) =>
    toListedPublicAlbum(category, summary, index)
  );
}

/** What the album page needs before it knows whether it may render anything. */
export type AlbumAccess = {
  sessionId: string;
  title: string;
  requiresPassword: boolean;
};

/**
 * Ask whether an album is behind the gallery password.
 *
 * Deliberately separate from `resolveAlbumById`: this reveals only the title
 * and that a password is needed, so the page can render the prompt without
 * ever having held the media.
 */
export async function fetchAlbumAccess(
  albumId: string
): Promise<AlbumAccess | null> {
  return safeGet<AlbumAccess>(`/public/sessions/${albumId}/access`, {
    // Never cached: whether an album is gated can change in the CMS at any
    // time, and a stale "no password needed" would render a gated album open.
    policy: "never",
    interactive: true
  });
}

/**
 * Exchange the gallery password for the album's contents.
 *
 * Called from the browser, so it hits the API directly rather than going
 * through `safeGet` — the caller needs to tell a wrong password (401) apart
 * from a failure, which `safeGet` flattens to `null`.
 */
export async function unlockAlbum(
  category: CategoryId,
  albumId: string,
  password: string
): Promise<
  { ok: true; album: ResolvedAlbum } | { ok: false; reason: "wrong" | "error" }
> {
  try {
    const res = await fetch(`${API_BASE}/public/sessions/${albumId}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store"
    });

    if (res.status === 401) return { ok: false, reason: "wrong" };
    if (!res.ok) return { ok: false, reason: "error" };

    const payload = (await res.json()) as GalleryPayload;
    return { ok: true, album: albumFromPayload(category, albumId, payload) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Resolve a single album for its own page at `/category/<category>/<albumId>`.
 *
 * Unlike `resolveCategoryAlbums`, this loads the session's media up front so
 * the page renders a full grid on the server rather than filling in after
 * hydration. `null` means the id belongs to neither a published session nor a
 * published session, and the caller should render a 404. Demo albums are no
 * longer served here: an id that matches nothing published is simply not found,
 * rather than opening a gallery of stock photography under the studio's name.
 */
export async function resolveAlbumById(
  category: CategoryId,
  albumId: string
): Promise<ResolvedAlbum | null> {
  const payload = await safeGet<GalleryPayload>(`/public/sessions/${albumId}`, {
    // Every item's thumbnail and source URL is signed, so this expires with
    // them rather than outliving them.
    policy: "signed",
    interactive: true
  });

  return payload ? albumFromPayload(category, albumId, payload) : null;
}

/**
 * Build the rendered album from a gallery payload.
 *
 * Split out of `resolveAlbumById` so an album unlocked with a password renders
 * through exactly the same mapping as an open one — the two cannot drift.
 */
export function albumFromPayload(
  category: CategoryId,
  albumId: string,
  payload: GalleryPayload
): ResolvedAlbum {
  // Both kinds are shown by their poster thumbnail; a video with no poster
  // yet is still renderable, since it can play from `sourceUrl`.
  const visible = payload.media.filter((m) => m.thumbnailUrl || m.sourceUrl);
  const photos: ResolvedPhoto[] = visible.map(toResolvedPhoto);

  // Supplies only the structural fields components still expect; every
  // rendered value below comes from the session itself.
  const base = buildFallbackShape(category, 0);

  // The item the cover shows — pinned if the admin chose one, otherwise the
  // same automatic pick the listing makes, so both views agree.
  const coverKey = coverKeyFrom(payload, photos);
  const cover = photos.find((p) => p.key === coverKey);

  return {
    ...base,
    id: albumId,
    isLive: true,
    sessionId: albumId,
    category,
    title: payload.session.title,
    description: payload.session.description,
    photoCount: payload.media.filter((m) => m.type === "image").length,
    photos,
    ...(cover ? { coverKey: cover.key } : {}),
    // The pinned cover wins, whatever its kind. Preferring the first image
    // here showed a still from the middle of the album while the admin had
    // deliberately pinned a video as the album's face.
    /**
     * An album whose cover has not been generated yet renders no cover at
     * all. It used to fall back to a seeded stock image, which put a photo
     * the studio never took at the head of a real gallery.
     */
    coverUrl: cover?.url ?? "",
    ...(cover?.type === "video" ? { coverType: "video" as const } : {}),
    // Only a file we host can play inline; a linked video has no such URL and
    // plays from its embed in the lightbox instead.
    ...(cover?.type === "video" && !cover.youTubeId && cover.sourceUrl
      ? { coverVideoUrl: cover.sourceUrl }
      : {}),
    ...(payload.settings?.watermarkPreviewImages && payload.settings.watermarkUrl
      ? { watermarkUrl: payload.settings.watermarkUrl }
      : {}),
    // Absent settings mean an unconfigured session, which allows downloads.
    allowDownloads: payload.settings?.allowDownloads ?? true,
    videoCount: payload.media.filter((m) => m.type === "video").length,
    location: payload.session.location,
    date: payload.session.eventDate
  };
}

/**
 * The structural fields a `ResolvedAlbum` carries beyond what a session
 * provides. Every displayed value comes from the session itself; this only
 * satisfies the shape components are typed against.
 */
function buildFallbackShape(category: CategoryId, index: number): Album {
  const id = `${category}-${index + 1}`;
  return {
    id,
    coverSeed: `badri-album-${id}-cover`,
    date: new Date().toISOString(),
    location: "",
    videoCount: 0,
    photoSeeds: []
  };
}

/**
 * Signed URL for one original file in a published session. Public — no client
 * login required, unlike the `/download/*` routes used for private galleries.
 */
export async function publicSingleDownloadUrl(
  sessionId: string,
  mediaId: string
): Promise<string | null> {
  const payload = await safeGet<{ url: string }>(
    `/public/sessions/${sessionId}/media/${mediaId}/download`,
    // Minted for this click; a cached copy would already be spent.
    { policy: "never" }
  );
  return payload?.url ?? null;
}

/**
 * Budget for building an archive. The server streams every original in the
 * gallery into a ZIP before it can answer, so this is far longer than an
 * ordinary read — but it is still bounded: without a limit a stalled request
 * left the album's "Preparing…" state stuck with no way back.
 */
const ARCHIVE_FETCH_TIMEOUT_MS = 180000;

/**
 * POST for a signed archive URL, shared by the whole-folder and selection
 * ZIPs. Both can take minutes to build and both fail the same way, so the
 * timeout and error handling live in one place.
 */
async function requestArchiveUrl(
  path: string,
  body?: Record<string, unknown>
): Promise<string | null> {
  if (!isConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ARCHIVE_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        : {})
    });
    if (!res.ok) {
      warn(path, `HTTP ${res.status}`);
      return null;
    }
    const payload = (await res.json()) as { url?: string };
    return payload.url ?? null;
  } catch (error) {
    warn(path, error instanceof Error ? error.message : String(error));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Signed URL for the whole folder as one ZIP. Public. */
export async function publicFolderZipUrl(sessionId: string): Promise<string | null> {
  return requestArchiveUrl(`/public/sessions/${sessionId}/download`);
}

/**
 * Signed URL for just the chosen files, as one ZIP. Public.
 *
 * One archive rather than one download per file: browsers throttle a burst of
 * saves triggered by a single gesture, so a large selection otherwise arrived
 * incomplete.
 */
export async function publicSelectionZipUrl(
  sessionId: string,
  mediaIds: string[]
): Promise<string | null> {
  if (mediaIds.length === 0) return null;
  return requestArchiveUrl(`/public/sessions/${sessionId}/download/selection`, {
    mediaIds
  });
}

/**
 * Published sessions across every category, newest event first.
 *
 * Backs the homepage feature sections, which select from the whole portfolio
 * rather than one category page. Returns an empty list on any failure so a
 * caller can fall back to placeholder content.
 */
export async function listPublicSessions(options: {
  category?: string;
  limit?: number;
} = {}): Promise<PublicAlbum[]> {
  const query = new URLSearchParams();
  if (options.category) query.set("category", options.category);
  if (options.limit) query.set("limit", String(options.limit));

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const payload = await safeGet<{ albums: PublicAlbum[] }>(
    `/public/sessions${suffix}`,
    // Cover URLs are signed, so this expires with them.
    { policy: "signed" }
  );
  return payload?.albums ?? [];
}

/**
 * Resolve the sessions a CMS section points at, in the order the admin chose.
 *
 * Ids that no longer resolve — the session was deleted, unpublished, or emptied
 * — are simply dropped, so a stale reference degrades to a shorter list rather
 * than a broken tile.
 */
export async function resolvePickedSessions(
  sessionIds: readonly string[]
): Promise<PublicAlbum[]> {
  if (sessionIds.length === 0) return [];

  // One unfiltered fetch beats N per-id requests, and the picker's ceiling is
  // well inside this endpoint's page size.
  const all = await listPublicSessions();
  const byId = new Map(all.map((album) => [album.id, album]));

  return sessionIds
    .map((id) => byId.get(id))
    .filter((album): album is PublicAlbum => Boolean(album));
}

/** Whether the backend is configured at all — useful for dev diagnostics. */
export const apiConfigured = isConfigured;

export async function getPublishedPageContent(
  pageKey: string
): Promise<PageContentPayload | null> {
  return safeGet<PageContentPayload>(`/pages/${pageKey}`, { policy: "cms" });
}

/**
 * The category list, labelled for the active locale.
 *
 * `fallback` is the set of ids that ship with a translation for every locale.
 * Those always take their label from `labelFor`, never from the CMS: a
 * `CmsCategory` holds one label string with no locale dimension, so honouring
 * it here would render the admin's English text on the Arabic site.
 *
 * Categories an admin added themselves have no translation to fall back on, so
 * they keep their CMS label in both locales — the only string that exists.
 */
export async function getCmsCategories(
  fallback: readonly string[],
  labelFor: (id: string) => string
): Promise<CmsCategory[]> {
  const page = await getPublishedPageContent("categories");
  const content = page?.content as HomepageCmsContent | undefined;
  const cmsCategories =
    content?.categories?.filter((category) => category.id && category.label) ?? [];

  const labelled =
    cmsCategories.length > 0
      ? cmsCategories.map((category) => ({
          id: category.id,
          label: fallback.includes(category.id)
            ? labelFor(category.id)
            : category.label
        }))
      : fallback.map((id) => ({ id, label: labelFor(id) }));

  return dropHiddenCategories(labelled);
}

/**
 * Remove categories whose own page is hidden in the CMS.
 *
 * The flag lives on each `category-<id>` record rather than the shared
 * `categories` list, so this costs one request per category — issued in
 * parallel, and each already cached by `safeGet`. A request that fails returns
 * null, which keeps the category visible: a flaky backend must not silently
 * empty the site's navigation.
 */
async function dropHiddenCategories(
  items: CmsCategory[]
): Promise<CmsCategory[]> {
  const pages = await Promise.all(
    items.map((item) => getPublishedPageContent(`category-${item.id}`))
  );

  return items.filter((_, index) => !pages[index]?.content.pageHidden);
}
