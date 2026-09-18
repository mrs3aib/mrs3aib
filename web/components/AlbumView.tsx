"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { albumPhotoUrl } from "@/lib/data";
import {
  publicFolderZipUrl,
  publicSelectionZipUrl,
  publicSingleDownloadUrl,
  type ResolvedAlbum,
  type ResolvedPhoto,
  fetchAlbumMediaPage
} from "@/lib/api";
import { triggerDownload } from "@/lib/download";
import {
  fetchSelectionZipUrl,
  fetchSessionZipUrl,
  isAuthenticated
} from "@/lib/clientAuth";
import {
  ArrowRight,
  CameraIcon,
  DownloadIcon,
  GridIcon,
  PinIcon,
  PlayIcon,
  QrIcon,
  RowsIcon,
  ShareIcon,
  VideoCameraIcon
} from "./icons";
import MediaLightbox from "./MediaLightbox";
import QrModal from "./QrModal";
import ResilientImage from "./ResilientImage";

type AlbumActionLabels = {
  back: string;
  download: string;
  preparing: string;
  downloadFailed: string;
  location: string;
  photos: string;
  qr: string;
  share: string;
  copied: string;
  copyFailed: string;
  video: string;
  cancelSelect: string;
  selectAll: string;
  clearSelection: string;
  downloadSelected: string;
  selectPrompt: string;
};

/** Which media the grid is showing. */
type MediaFilter = "all" | "photos" | "videos";

/** How the grid lays out — tiles, or one wide row per item. */
type ViewMode = "grid" | "rows";

/**
 * Where the album is being rendered.
 *
 * `modal` is the in-place overlay opened from a category grid; `page` is the
 * standalone route at `/category/<category>/<albumId>`. The two differ only in
 * their frame — the panel, controls, and grid below are identical — so the body
 * lives here once and the variant decides the wrapper and the back control.
 */
export type AlbumViewVariant = "modal" | "page";

function useAlbumMeta(album: ResolvedAlbum, categoryLabel: string) {
  const locale = useLocale();
  const t = useTranslations("albums");
  const itemKey = `items.${album.id}` as const;

  const title = album.title ?? t(`${itemKey}.title`);
  const type = album.isLive ? categoryLabel : t(`${itemKey}.type`);
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date(album.date));
  }, [album.date, locale]);

  return { locale, title, type, formattedDate };
}

/**
 * Copy text, falling back to the pre-clipboard-API approach.
 *
 * `navigator.clipboard` is undefined outside a secure context and can be
 * refused by permission policy, so a copy that relies on it alone fails
 * silently on plain HTTP. The hidden-textarea route still works there.
 * Returns whether the text actually reached the clipboard.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path rather than giving up */
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    // Kept out of view and out of the tab order, and `readOnly` stops the
    // mobile keyboard appearing for an element the visitor never sees.
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-9999px";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

function useAlbumUrl(album: ResolvedAlbum) {
  const [albumUrl, setAlbumUrl] = useState("");

  /**
   * The canonical link to this album: `/<locale>/category/<category>/<id>`.
   *
   * The standalone page is already at that address. The modal is not — it is an
   * overlay above whichever page opened it, so it previously shared that page's
   * URL with `?album=<id>` appended. Nothing reads that parameter, so scanning
   * the QR from the homepage reopened the homepage rather than the album, and
   * the link differed depending on where the modal was opened from.
   *
   * A placeholder album has no route of its own, so it keeps the current URL.
   */
  useEffect(() => {
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    const url = new URL(configuredOrigin || window.location.origin);

    // Arabic is the public site's configured default locale. Share and QR
    // links therefore remain stable even when the visitor opened this album
    // from English, and they use the production origin once it is configured.
    if (album.category) {
      url.pathname = `/ar/category/${album.category}/${album.id}`;
    }
    url.search = "";
    url.hash = "";

    setAlbumUrl(url.toString());
  }, [album.id, album.category]);

  return albumUrl;
}

/**
 * How many items each follow-up request pulls.
 *
 * Larger than the server-rendered first page: by the time these run the page
 * is already interactive, so the cost is a background fetch rather than time
 * to first paint. Small enough that one slow response does not hold back
 * everything behind it.
 */
const ALBUM_PAGE_SIZE = 60;

/**
 * The album's photos, starting from what the server rendered and filling in
 * the rest from the browser.
 *
 * The page now ships only a first page of media so it can paint quickly; the
 * remainder arrives here. Pages are appended in order, so the grid grows
 * downward and nothing already on screen moves.
 *
 * Placeholder albums and password-gated ones have no session to page through,
 * and are returned untouched.
 */
/**
 * How a view fetches one more page of media.
 *
 * An open album pages through the public endpoint; a gated one must re-send its
 * password on every request, so the gate supplies its own fetcher rather than
 * this hook reaching for a route that would answer 401.
 */
type MediaPager = (
  offset: number,
  limit: number
) => Promise<{ photos: ResolvedPhoto[]; total: number } | null>;

function useProgressiveAlbumPhotos(
  album: ResolvedAlbum,
  pager?: MediaPager
): {
  photos: ResolvedPhoto[];
  loadingMore: boolean;
  /** Whether any media remains unfetched beyond what is rendered. */
  hasMore: boolean;
  /** Fetch the next page; called as the grid's end comes into view. */
  loadMore: () => void;
} {
  const [extra, setExtra] = useState<ResolvedPhoto[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  /**
   * Whether the server has said there is nothing left.
   *
   * Paging used to stop by comparing what had loaded against the album's photo
   * and video counts. Those describe the album; what loads here is what the
   * grid can render, and any gap between the two left `hasMore` permanently
   * true — a spinner that never cleared and a fetch that refired every time the
   * sentinel came back into view. A page that comes back short is the server
   * saying it has reached the end, which cannot drift from any count.
   */
  const [exhausted, setExhausted] = useState(false);

  // A different album must not inherit the previous one's tail.
  useEffect(() => {
    setExtra([]);
    setExhausted(false);
  }, [album.sessionId]);

  const firstPage = album.photos.length;
  const loadedCount = firstPage + extra.length;
  /**
   * The album's own size, which the server sends with the first page.
   *
   * Zero means the totals are missing (a placeholder album, or an older
   * response), and paging then relies on `exhausted` alone.
   */
  const total = (album.photoCount || 0) + (album.videoCount || 0);

  /**
   * Whether anything remains to fetch.
   *
   * `exhausted` records what the server has already said; the count check is
   * what stops a request that is knowably pointless. Without it every album
   * short enough to arrive complete in its first page still fired one fetch to
   * discover there was nothing left — an album of a dozen items spun a loader
   * and asked for rows the page already had. The counts describe exactly the
   * media this list receives, so comparing them is safe.
   */
  const hasMore =
    Boolean(album.sessionId) &&
    firstPage > 0 &&
    !exhausted &&
    (total === 0 || loadedCount < total);

  /**
   * Guards against a second fetch starting before `loadingMore` is committed:
   * the observer can fire twice within a frame, and state set in the first
   * callback is not visible to the second.
   */
  const fetching = useRef(false);

  useEffect(() => {
    fetching.current = false;
  }, [album.sessionId]);

  /**
   * Fetch the next page.
   *
   * This used to run as a loop that pulled the whole album the moment it
   * mounted, so a large session mounted every tile at once — hundreds of image
   * elements, each with its own transitions and a pulsing skeleton, all paying
   * layout and paint on every scroll frame. Pages are now pulled only as the
   * reader approaches the end of what is already rendered.
   */
  const loadMore = useCallback(() => {
    const sessionId = album.sessionId;
    if (!sessionId || fetching.current) return;
    fetching.current = true;
    setLoadingMore(true);

    void (async () => {
      try {
        const offset = loadedCount;
        const page = pager
          ? await pager(offset, ALBUM_PAGE_SIZE)
          : await fetchAlbumMediaPage(sessionId, offset, ALBUM_PAGE_SIZE);
        /**
         * A failed request is not an exhausted album, so it leaves `exhausted`
         * alone and the sentinel may retry. Anything else settles paging from
         * what the server actually sent rather than from a predicted total.
         */
        if (!page) return;
        if (page.photos.length > 0) {
          setExtra((current) => [...current, ...page.photos]);
        }
        // Short page means the end. `total` is checked too so an album whose
        // length divides exactly by the page size does not need one extra
        // empty round trip to notice it has finished.
        if (
          page.photos.length < ALBUM_PAGE_SIZE ||
          offset + page.photos.length >= page.total
        ) {
          setExhausted(true);
        }
      } finally {
        setLoadingMore(false);
        fetching.current = false;
      }
    })();
  }, [album.sessionId, loadedCount, pager]);

  const photos = useMemo(() => {
    if (extra.length === 0) return album.photos;
    // A retry or a StrictMode double-run can deliver the same page twice; the
    // key is the media id, so de-duplicating here keeps React keys unique.
    const seen = new Set(album.photos.map((photo) => photo.key));
    const merged = [...album.photos];
    for (const photo of extra) {
      if (seen.has(photo.key)) continue;
      seen.add(photo.key);
      merged.push(photo);
    }
    return merged;
  }, [album.photos, extra]);

  return { photos, loadingMore, hasMore, loadMore };
}

function useAlbumMedia(
  album: ResolvedAlbum,
  filter: MediaFilter,
  allPhotos: ResolvedPhoto[]
) {
  /**
   * The items the grid is showing. Everything downstream — select-all, the
   * lightbox's next/previous, the counts — works off this rather than the full
   * album, so the controls always match what the reader can actually see.
   */
  const visiblePhotos = useMemo(() => {
    if (filter === "photos") {
      return allPhotos.filter((p) => p.type !== "video");
    }
    if (filter === "videos") {
      return allPhotos.filter((p) => p.type === "video");
    }
    return allPhotos;
  }, [allPhotos, filter]);

  /**
   * Linked videos are watched on YouTube and have no file behind them, so they
   * carry no checkbox — and "select all" must ignore them too, or it would tick
   * everything while the ZIP silently came back short.
   */
  const selectablePhotos = useMemo(
    () => visiblePhotos.filter((p) => !p.youTubeId),
    [visiblePhotos]
  );

  /**
   * The album's own totals win over counting what is loaded.
   *
   * The grid now starts with a first page and fills in the rest, so counting
   * `album.photos` would show the page size — "10 photos" on an album of seven
   * hundred — and climb as more arrived. `album.photoCount` comes from the
   * server and describes the whole album.
   *
   * The server counts only media it could actually hand over, which is the same
   * set the grid renders, so the header and the tile count now agree. They are
   * counted from one list server-side precisely so they cannot drift again.
   */
  const loadedPhotos = allPhotos.filter((p) => p.type !== "video").length;
  const loadedVideos = allPhotos.filter((p) => p.type === "video").length;
  const photoCount = album.photoCount || loadedPhotos;
  const videoCount = album.videoCount || loadedVideos;

  return { visiblePhotos, selectablePhotos, photoCount, videoCount };
}

export default function AlbumView({
  album,
  categoryLabel,
  variant,
  onBack,
  backHref,
  pager
}: {
  album: ResolvedAlbum;
  categoryLabel: string;
  variant: AlbumViewVariant;
  /** Modal only — closes the overlay. */
  onBack?: () => void;
  /** Page only — where the "back to galleries" control navigates. */
  backHref?: string;
  /**
   * How to fetch further pages. Supplied by the password gate, whose album
   * cannot be paged through the open endpoint. Omitted for an open album,
   * which uses that endpoint directly.
   */
  pager?: MediaPager;
}) {
  const t = useTranslations("albums");
  const [showQr, setShowQr] = useState(false);
  /** Whether the last share press copied the link, failed, or has faded. */
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const [downloadState, setDownloadState] = useState<
    "idle" | "preparing" | "error"
  >("idle");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  /**
   * Downloads switched off in the gallery settings. The server refuses these
   * requests either way; hiding the controls keeps the page from offering a
   * button that can only fail.
   */
  const allowDownloads = album.allowDownloads !== false;
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const {
    locale,
    title: albumTitle,
    type: albumType,
    formattedDate
  } = useAlbumMeta(album, categoryLabel);
  const albumUrl = useAlbumUrl(album);
  /**
   * The server rendered a first page; the rest streams in here. Everything
   * downstream reads `allPhotos`, so the grid, the lightbox and "select all"
   * all grow together as pages land.
   */
  const {
    photos: allPhotos,
    loadingMore,
    hasMore,
    loadMore
  } = useProgressiveAlbumPhotos(album, pager);
  const { visiblePhotos, selectablePhotos, photoCount, videoCount } = useAlbumMedia(
    album,
    filter,
    allPhotos
  );

  const labels: AlbumActionLabels = {
    back: t("backToGalleries"),
    download: t("downloadAll"),
    preparing: t("preparing"),
    downloadFailed: t("downloadFailed"),
    location: t("location"),
    photos: t("photos"),
    qr: t("qr"),
    share: t("share"),
    copied: t("copied"),
    copyFailed: t("copyFailed"),
    video: t("video"),
    cancelSelect: t("cancelSelect"),
    selectAll: t("selectAll"),
    clearSelection: t("clearSelection"),
    downloadSelected: t("downloadSelected"),
    selectPrompt: t("selectPrompt")
  };

  /** Show the failure label, then return the button to its normal state. */
  const failDownload = () => {
    setDownloadState("error");
    window.setTimeout(() => setDownloadState("idle"), 3000);
  };

  /**
   * Download the whole folder as one ZIP.
   *
   * Published sessions are public, so no login is needed. A signed-in client
   * still uses the authenticated route, which records the download in their
   * history. Placeholder albums have no session to archive.
   */
  const downloadAll = async () => {
    // Placeholder albums have no session to archive. Saving each demo image in
    // turn is at least a real download — the old behaviour opened the cover in
    // a new tab, which looked like the button was broken.
    if (!album.isLive || !album.sessionId) {
      setDownloadState("preparing");
      try {
        for (const [index, photo] of album.photos.entries()) {
          if (!photo.seed) continue;
          await triggerDownload(
            albumPhotoUrl(photo.seed, 1600, 1200),
            `${albumTitle}-${index + 1}.jpg`
          );
        }
        setDownloadState("idle");
      } catch {
        failDownload();
      }
      return;
    }

    setDownloadState("preparing");
    try {
      // A signed-in client uses the authenticated route so the download is
      // recorded against their account; visitors use the public ZIP.
      const url = isAuthenticated()
        ? (await fetchSessionZipUrl(album.sessionId)).url
        : await publicFolderZipUrl(album.sessionId);
      if (!url) throw new Error("No download URL");
      await triggerDownload(url, `${albumTitle}.zip`);
      setDownloadState("idle");
    } catch {
      failDownload();
    }
  };

  const toggleSelected = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key]
    );
  };

  /**
   * Open the lightbox on the item the cover image is showing.
   *
   * The cover is often neither the first item nor an image — a pinned YouTube
   * video is a common choice — so opening index 0 showed the first photo
   * instead of what was just clicked. When the cover is filtered out of the
   * current view, or is not identified at all, the first visible item is the
   * only sensible thing left to open.
   */
  const openCover = useCallback(() => {
    const at = album.coverKey
      ? visiblePhotos.findIndex((p) => p.key === album.coverKey)
      : -1;
    setLightboxIndex(at >= 0 ? at : 0);
  }, [album.coverKey, visiblePhotos]);

  const allSelected =
    selectablePhotos.length > 0 &&
    selectablePhotos.every((p) => selectedKeys.includes(p.key));

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? [] : selectablePhotos.map((p) => p.key));
  };

  const exitSelectMode = () => {
    setSelectedKeys([]);
  };

  /**
   * Download the current selection as one ZIP. Falls back to saving each file
   * individually for placeholder albums, which have no session to archive.
   */
  const downloadSelected = async () => {
    if (selectedKeys.length === 0) return;
    const chosen = album.photos.filter((p) => selectedKeys.includes(p.key));

    // Placeholder albums have no session to archive — save the seeds directly.
    if (!album.isLive || !album.sessionId) {
      // Sequential, not Promise.all: browsers cancel rapid parallel downloads.
      for (const [index, photo] of chosen.entries()) {
        if (!photo.seed) continue;
        await triggerDownload(
          albumPhotoUrl(photo.seed, 1600, 1200),
          `${albumTitle}-${index + 1}.jpg`
        );
      }
      exitSelectMode();
      return;
    }

    // Linked videos have no file of ours to archive; the server would reject
    // their ids outright, failing the whole selection over one embed.
    const archivable = chosen.filter((photo) => !photo.youTubeId);
    if (archivable.length === 0) {
      failDownload();
      return;
    }

    setDownloadState("preparing");
    try {
      // One archive, not one download per file: browsers throttle a burst of
      // saves from a single gesture, so large selections used to arrive
      // incomplete while still reporting success.
      const mediaIds = archivable.map((photo) => photo.key);
      // A signed-in client uses the authenticated route so the download is
      // recorded against their account; visitors use the public ZIP.
      const url = isAuthenticated()
        ? (await fetchSelectionZipUrl(album.sessionId, mediaIds)).url
        : await publicSelectionZipUrl(album.sessionId, mediaIds);
      if (!url) throw new Error("No download URL");
      await triggerDownload(url, `${albumTitle}.zip`);
      setDownloadState("idle");
      exitSelectMode();
    } catch {
      failDownload();
    }
  };

  /**
   * Share the album, or copy its link where sharing is unavailable.
   *
   * Both `navigator.share` and `navigator.clipboard` exist only in a secure
   * context, so on plain HTTP — and in any browser that refuses clipboard
   * permission — the copy threw into an empty catch and the button did
   * nothing at all. On desktop, where `navigator.share` is absent, even the
   * success path was silent: the link was copied and nothing on screen said
   * so, which is indistinguishable from a dead button.
   *
   * So: a fallback that works without the clipboard API, and visible feedback
   * either way.
   */
  const shareAlbum = async () => {
    if (!albumUrl) return;

    // The native sheet is its own confirmation, and a visitor dismissing it
    // has not failed at anything — neither case needs a badge.
    if (navigator.share) {
      try {
        await navigator.share({ title: albumTitle, url: albumUrl });
      } catch {
        /* dismissed, or the sheet refused — nothing to report */
      }
      return;
    }

    setShareState((await copyText(albumUrl)) ? "copied" : "failed");
  };

  /**
   * Clear the badge after a moment, so it reads as a confirmation of the press
   * rather than a permanent label.
   */
  useEffect(() => {
    if (shareState === "idle") return;
    const timer = window.setTimeout(() => setShareState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [shareState]);

  const body = (
    <>
      <AlbumViewHeader
        labels={labels}
        onBack={onBack}
        backHref={backHref}
      />

      <div className="grid gap-8 rounded-2xl border border-white/25 bg-black/20 p-5 lg:grid-cols-12 lg:rtl:[direction:ltr] md:p-7">
        <AlbumPreview
          album={album}
          title={albumTitle}
          onOpen={visiblePhotos.length > 0 ? openCover : undefined}
        />
        <AlbumSummary
          album={album}
          categoryLabel={categoryLabel}
          labels={labels}
          title={albumTitle}
          type={albumType}
          formattedDate={formattedDate}
          onShare={shareAlbum}
          shareState={shareState}
          onToggleQr={() => setShowQr((current) => !current)}
          onDownloadAll={downloadAll}
          downloadState={downloadState}
          allowDownloads={allowDownloads}
        />
      </div>

      <AlbumToolbar
        labels={labels}
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        photoCount={photoCount}
        videoCount={videoCount}
        // The album's size, not how much of it has paged in. This used to be
        // `allPhotos.length`, which climbed as the reader scrolled and
        // disagreed with the per-kind counts beside it.
        totalCount={photoCount + videoCount}
        selectedCount={selectedKeys.length}
        allSelected={allSelected}
        downloadState={downloadState}
        onCancelSelect={exitSelectMode}
        onToggleSelectAll={toggleSelectAll}
        onDownloadSelected={downloadSelected}
        allowDownloads={allowDownloads}
      />
      <AlbumPhotoGrid
        album={album}
        photos={visiblePhotos}
        title={albumTitle}
        viewMode={viewMode}
        selectedKeys={selectedKeys}
        onToggleSelected={toggleSelected}
        onOpen={(index) => setLightboxIndex(index)}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </>
  );

  // Both variants show the lightbox and QR dialog; only the frame differs.
  const overlays = (
    <>
      <MediaLightbox
        items={visiblePhotos}
        index={lightboxIndex}
        title={albumTitle}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      <QrModal
        open={showQr}
        albumUrl={albumUrl}
        title={albumTitle}
        onClose={() => setShowQr(false)}
      />
    </>
  );

  return (
    <>
      <AlbumFrame variant={variant} onBack={onBack}>
        {body}
      </AlbumFrame>
      {overlays}
    </>
  );
}

function AlbumFrame({
  variant,
  onBack,
  children
}: {
  variant: AlbumViewVariant;
  onBack?: () => void;
  children: ReactNode;
}) {
  if (variant === "page") {
    return (
      /*
       * `min-h-svh`, not `min-h-screen`. `100vh` on a phone is the viewport
       * *including* the browser chrome that hides as you scroll, so the frame
       * was always taller than what is actually visible and left a band of dead
       * black between the album and the footer. `svh` is the small viewport
       * height — the space that is really there.
       */
      <div className="relative min-h-svh overflow-hidden bg-black">
        {/*
          Pinned to the viewport, not the document. `absolute inset-0` stretched
          the backdrop over the album's full scroll height, so `bg-cover` scaled
          a 1672x941 photo across thousands of pixels and showed a heavily
          zoomed crop instead of the image.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-[url('/images/album-photography-bg.png')] bg-cover bg-center bg-no-repeat"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-black/40"
        />
        <div className="relative z-10 px-4 pb-16 pt-28 md:px-8 md:pt-32">
          <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-accent/45 bg-[rgba(10,10,10,0.76)] px-5 py-5 text-primary shadow-2xl shadow-black/70 backdrop-blur-sm md:px-8 md:py-7">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-90 overflow-y-auto bg-black px-3 py-6 md:px-8 md:py-10"
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
      onClick={onBack}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[url('/images/album-photography-bg.png')] bg-cover bg-center bg-no-repeat opacity-80"
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black/45" />
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-accent/45 bg-[rgba(10,10,10,0.82)] px-5 py-5 text-primary shadow-2xl shadow-black/70 backdrop-blur-sm md:px-8 md:py-7"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * The top control row.
 *
 * The back control is a button in the modal (it closes the overlay) and a link
 * on the standalone page (it navigates back to the category), so one row serves
 * both variants without the caller restyling it.
 */
function AlbumViewHeader({
  labels,
  onBack,
  backHref
}: {
  labels: AlbumActionLabels;
  onBack?: () => void;
  backHref?: string;
}) {
  const backClass =
    "inline-flex items-center gap-2 text-sm text-accent/85 transition-colors hover:text-accent";

  return (
    <div className="mb-5 flex items-center justify-end border-b border-white/20 pb-4 rtl:flex-row-reverse">
      {backHref ? (
        <Link href={backHref} className={backClass}>
          {labels.back}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={backClass}>
          {labels.back}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      )}
    </div>
  );
}

/**
 * The album's feature panel.
 *
 * When the admin pinned a video as the cover this plays it inline, poster
 * first, so the play button is a real control rather than decoration. A still
 * cover keeps the button only when there is something to open — otherwise it
 * promised a player that did not exist.
 */
function AlbumPreview({
  album,
  title,
  onOpen
}: {
  album: ResolvedAlbum;
  title: string;
  onOpen?: () => void;
}) {
  const t = useTranslations("albums");
  const [playing, setPlaying] = useState(false);
  /**
   * A video cover we host can play inline from `coverVideoUrl`. A linked one
   * has no file of ours, so it plays in the lightbox's embed instead — without
   * this it fell through to `onOpen` and opened the first photo, which is not
   * the item the visitor just clicked.
   */
  const isVideoCover = album.coverType === "video" && Boolean(album.coverVideoUrl);
  const isEmbedCover = album.coverType === "video" && !album.coverVideoUrl;

  return (
    <div className="lg:col-span-6">
      <div className="gradient-border-frame aspect-[4/3] w-full rounded-2xl md:aspect-[16/11]">
        <div className="group relative h-full w-full overflow-hidden rounded-2xl bg-neutral-900">
          {isVideoCover && playing ? (
            <video
              src={album.coverVideoUrl}
              poster={album.coverUrl}
              controls
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full bg-black object-contain"
            />
          ) : (
            <>
              <ResilientImage
                src={album.coverUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 48vw"
                className="object-cover"
                priority
                unoptimized={album.isLive}
                // One frame, and the first thing on the page, so it is worth
                // animating rather than leaving as a flat block.
                shimmer
                {...(album.coverPreviewDataUrl
                  ? { previewDataUrl: album.coverPreviewDataUrl }
                  : {})}
              />
              {album.watermarkUrl ? (
                <img
                  src={album.watermarkUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain p-8 opacity-70"
                />
              ) : null}
              {isVideoCover || onOpen ? (
                <button
                  type="button"
                  aria-label={
                    isVideoCover || isEmbedCover ? t("playVideo") : t("view")
                  }
                  onClick={() => (isVideoCover ? setPlaying(true) : onOpen?.())}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25"
                >
                  {/*
                    Video keeps a visible badge: playback is a distinct action
                    a still frame gives no hint of, so the control has to be
                    shown. An image cover only opens a larger view of what is
                    already on screen — the picture itself reads as the target,
                    and a badge sitting over it just covers the photo it is
                    advertising. The button still fills the frame, so the whole
                    cover stays clickable and keyboard-reachable; only the
                    marker is gone.
                  */}
                  {isVideoCover || isEmbedCover ? (
                    <span className="flex h-16 w-16 items-center justify-center rounded border border-white/35 bg-black/55 text-white backdrop-blur-md transition-transform duration-500 group-hover:scale-105 group-active:scale-105">
                      <PlayIcon className="h-6 w-6" />
                    </span>
                  ) : null}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AlbumSummary({
  album,
  categoryLabel,
  labels,
  title,
  type,
  formattedDate,
  onShare,
  shareState,
  onToggleQr,
  onDownloadAll,
  downloadState,
  allowDownloads
}: {
  album: ResolvedAlbum;
  categoryLabel: string;
  labels: AlbumActionLabels;
  title: string;
  type: string;
  formattedDate: string;
  onShare: () => void;
  shareState: "idle" | "copied" | "failed";
  onToggleQr: () => void;
  onDownloadAll: () => void;
  downloadState: "idle" | "preparing" | "error";
  allowDownloads: boolean;
}) {
  /**
   * The server's totals, never a count of what has arrived.
   *
   * `album.photos` used to be the whole album, so counting it here was a way of
   * reporting exactly what the grid could render. It is now only the first
   * page, and counting it announced the page size as the album size — "12
   * photos" on an album of seven hundred.
   *
   * The server counts the same displayable media it serves, so these already
   * describe what the grid will show once it has finished paging.
   */
  const photoCount = album.photoCount;
  const videoCount = album.videoCount;

  return (
    <div className="flex flex-col justify-center text-center lg:col-span-6 lg:rtl:[direction:rtl]">
      <h1 className="font-display text-3xl font-semibold leading-tight text-primary md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-secondary">
        {formattedDate} - {album.location}
      </p>
      <p className="mt-2 text-sm text-secondary">
        {type} - {categoryLabel}
      </p>

      <div className="mx-auto mt-8 grid w-full max-w-lg grid-cols-3 gap-5">
        <AlbumStat icon={<CameraIcon className="h-5 w-5" />}>
          {photoCount} {labels.photos}
        </AlbumStat>
        <AlbumStat icon={<VideoCameraIcon className="h-5 w-5" />}>
          {videoCount} {labels.video}
        </AlbumStat>
        <AlbumStat icon={<PinIcon className="h-5 w-5" />}>
          {labels.location}
        </AlbumStat>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {allowDownloads ? (
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={downloadState === "preparing"}
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded bg-accent px-5 py-3 text-sm font-medium text-black transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-70"
          >
            <DownloadIcon className="h-4 w-4" />
            {downloadState === "preparing"
              ? labels.preparing
              : downloadState === "error"
                ? labels.downloadFailed
                : labels.download}
          </button>
        ) : null}
        {/* The label carries the confirmation: a copy that says nothing is
            indistinguishable from a button that does nothing. */}
        <button
          type="button"
          onClick={onShare}
          aria-live="polite"
          className={`inline-flex min-w-36 items-center justify-center gap-2 rounded border px-5 py-3 text-sm font-medium transition-colors ${
            shareState === "copied"
              ? "border-accent text-accent"
              : shareState === "failed"
                ? "border-red-400/60 text-red-300"
                : "border-white/30 text-primary hover:border-accent hover:text-accent"
          }`}
        >
          <ShareIcon className="h-4 w-4" />
          {shareState === "copied"
            ? labels.copied
            : shareState === "failed"
              ? labels.copyFailed
              : labels.share}
        </button>
        <button
          type="button"
          onClick={onToggleQr}
          className="inline-flex min-w-32 items-center justify-center gap-2 rounded border border-white/30 px-5 py-3 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
        >
          <QrIcon className="h-4 w-4" />
          {labels.qr}
        </button>
      </div>

      <AlbumDescription description={album.description} />
    </div>
  );
}

function AlbumDescription({ description }: { description?: string | null }) {
  if (!description) return null;

  return (
    <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-secondary">
      {description}
    </p>
  );
}

function AlbumStat({
  icon,
  children
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-secondary">
      <span className="text-accent">{icon}</span>
      <span className="text-xs leading-5">{children}</span>
    </div>
  );
}

/**
 * Filter chips, the layout toggle, and the selection bar.
 *
 * There is no explicit "select" mode any more: the tiles always carry a
 * checkbox, and the selection actions appear as soon as something is ticked.
 * That removes a step — previously nothing could be picked until select mode
 * had been entered first.
 */
function AlbumToolbar({
  labels,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  photoCount,
  videoCount,
  totalCount,
  selectedCount,
  allSelected,
  downloadState,
  onCancelSelect,
  onToggleSelectAll,
  onDownloadSelected,
  allowDownloads
}: {
  labels: AlbumActionLabels;
  filter: MediaFilter;
  onFilterChange: (next: MediaFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (next: ViewMode) => void;
  photoCount: number;
  videoCount: number;
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  downloadState: "idle" | "preparing" | "error";
  onCancelSelect: () => void;
  onToggleSelectAll: () => void;
  onDownloadSelected: () => void;
  allowDownloads: boolean;
}) {
  const t = useTranslations("albums");

  const chip = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-accent text-black"
        : "border border-white/30 text-secondary hover:border-accent hover:text-accent"
    }`;

  return (
    <div className="mt-4 border-b border-white/20 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={chip(filter === "all")}
          >
            {t("filterAll")} ({totalCount})
          </button>
          {/* A filter for a kind this album has none of would always land on an
              empty grid, so it is not offered. */}
          {photoCount > 0 ? (
            <button
              type="button"
              onClick={() => onFilterChange("photos")}
              className={chip(filter === "photos")}
            >
              {t("filterPhotos")} ({photoCount})
            </button>
          ) : null}
          {videoCount > 0 ? (
            <button
              type="button"
              onClick={() => onFilterChange("videos")}
              className={chip(filter === "videos")}
            >
              {t("filterVideos")} ({videoCount})
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 rounded-full border border-white/30 p-1">
          <button
            type="button"
            aria-label={t("viewGrid")}
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              viewMode === "grid" ? "bg-accent text-black" : "text-secondary hover:text-accent"
            }`}
          >
            <GridIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("viewRows")}
            aria-pressed={viewMode === "rows"}
            onClick={() => onViewModeChange("rows")}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              viewMode === "rows" ? "bg-accent text-black" : "text-secondary hover:text-accent"
            }`}
          >
            <RowsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-black/10 px-3 py-2.5">
          <span className="text-xs font-medium text-primary">
            {t("selectedCount", { count: selectedCount })}
          </span>
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="text-xs text-secondary underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            {allSelected ? labels.clearSelection : labels.selectAll}
          </button>
          {allowDownloads ? (
            <button
              type="button"
              onClick={onDownloadSelected}
              disabled={downloadState === "preparing"}
              className="inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-xs font-medium text-accent transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              {downloadState === "preparing"
                ? labels.preparing
                : downloadState === "error"
                  ? labels.downloadFailed
                  : labels.downloadSelected}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancelSelect}
            className="text-xs text-secondary transition-colors hover:text-accent"
          >
            {labels.cancelSelect}
          </button>
        </div>
      ) : null}
    </div>
  );
}


/**
 * The album's media, as tiles or as wide rows.
 *
 * Tapping an item opens it in the lightbox; the checkbox in its corner is
 * always present, so a selection can be started without entering a mode first.
 * The checkbox stops propagation so ticking never also opens the viewer.
 */
function AlbumPhotoGrid({
  album,
  photos,
  title,
  viewMode,
  selectedKeys,
  onToggleSelected,
  onOpen,
  loadingMore,
  hasMore,
  onLoadMore
}: {
  album: ResolvedAlbum;
  photos: ResolvedPhoto[];
  title: string;
  viewMode: ViewMode;
  selectedKeys: string[];
  onToggleSelected: (key: string) => void;
  onOpen: (index: number) => void;
  /** Whether further pages of media are still arriving. */
  loadingMore: boolean;
  /** Whether any media remains unfetched beyond what is rendered. */
  hasMore: boolean;
  /** Ask for the next page; called as the grid's end comes into view. */
  onLoadMore: () => void;
}) {
  const t = useTranslations("albums");
  const [failed, setFailed] = useState<string | null>(null);
  // Derived from the album this grid already has, rather than threaded down as
  // another prop.
  const allowDownloads = album.allowDownloads !== false;

  /**
   * Placeholders can be re-requested at any size, so link them directly. A live
   * photo's grid URL is a signed *thumbnail*, so fetch a fresh signed URL for
   * the original instead of downloading the small version.
   */
  const onDownloadPhoto = async (photo: ResolvedPhoto, index: number) => {
    const extension = photo.type === "video" ? "mp4" : "jpg";
    const fileName = `${title}-${index + 1}.${extension}`;
    if (photo.seed) {
      await triggerDownload(albumPhotoUrl(photo.seed, 1600, 1200), fileName);
      return;
    }
    try {
      const url = album.sessionId
        ? await publicSingleDownloadUrl(album.sessionId, photo.key)
        : null;
      if (!url) throw new Error("No download URL");
      await triggerDownload(url, fileName);
    } catch {
      // Previously this opened the thumbnail in a new tab, which looked like a
      // broken download ("it just previews"). Surface the reason instead.
      setFailed(photo.key);
      window.setTimeout(() => setFailed(null), 3000);
    }
  };

  /**
   * Pull the next page as the end of the grid comes into view.
   *
   * `rootMargin` starts the fetch a screen early so the next tiles are usually
   * decoded by the time they are scrolled to, rather than the reader hitting a
   * blank run and waiting. The observer is the only thing driving paging, so
   * nothing is fetched for an album the reader never scrolls through.
   */
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (photos.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-secondary">{t("empty")}</p>
    );
  }

  const isRows = viewMode === "rows";

  return (
    <>
    <div
      className={
        isRows
          ? "mt-4 flex flex-col gap-3"
          : "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
      }
    >
      {photos.map((photo, index) => {
        const selected = selectedKeys.includes(photo.key);
        return (
          <div
            key={photo.key}
            className={`group relative overflow-hidden rounded-sm border border-[#ddd] bg-neutral-900 transition-colors hover:border-accent ${
              isRows ? "flex h-28 items-center" : "aspect-[4/3]"
            } ${
              selected ? "ring-2 ring-black ring-offset-2 ring-offset-accent" : ""
            }`}
            /*
             * The grid only ever appends, so a long album ends up holding every
             * tile it has scrolled past — each one still paying style and paint
             * on every frame. `content-visibility` lets the browser skip that
             * work entirely for tiles outside the viewport.
             *
             * The intrinsic size is what it reserves for a skipped tile. A grid
             * tile derives its own height from `aspect-[4/3]`, so only the row
             * layout's fixed 7rem needs stating; guessing wrong there would
             * shift the scrollbar as tiles entered and left.
             */
            style={{
              contentVisibility: "auto",
              ...(isRows ? { containIntrinsicSize: "auto 7rem" } : {})
            }}
          >
            {/* The tile itself opens the viewer. A button rather than a bare
                div so it is reachable by keyboard. */}
            <button
              type="button"
              onClick={() => onOpen(index)}
              aria-label={`${t("view")} ${title} ${index + 1}`}
              className={`relative block overflow-hidden ${
                isRows ? "h-full w-44 shrink-0" : "h-full w-full"
              }`}
            >
              <ResilientImage
                /*
                 * Only a real thumbnail. Without a generated one `photo.url`
                 * falls back to the original file, and a grid of those pulls
                 * tens of megabytes to fill tiles a few hundred pixels wide.
                 * An unrenderable item already gives an empty frame, and
                 * passing no source takes the same path.
                 */
                src={
                  photo.isPlaceholder || photo.hasThumbnail ? photo.url : null
                }
                alt={`${title} ${index + 1}`}
                fill
                sizes={isRows ? "176px" : "(max-width: 640px) 50vw, 20vw"}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-active:scale-105"
                // Signed backend URLs are already sized and expire, so routing them
                // through the Next optimizer would only add a cache that outlives them.
                unoptimized={!photo.isPlaceholder}
                // Gives the tile this photograph's own colours while the real
                // thumbnail is still decoding, rather than a grey block.
                {...(photo.previewDataUrl
                  ? { previewDataUrl: photo.previewDataUrl }
                  : {})}
                // Stated rather than left to the default: no tile here is ever
                // above the fold on a scrolled album, and a fast scroll through
                // a large one would otherwise start decoding far more than it
                // shows.
                loading="lazy"
                // Decoding off the main thread, so an arriving thumbnail cannot
                // block the frame the reader is scrolling through.
                decoding="async"
              />
              {album.watermarkUrl ? (
                <img
                  src={album.watermarkUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain p-3 opacity-70"
                />
              ) : null}
              <span className="absolute inset-0 bg-accent/0 transition-colors duration-300 group-hover:bg-accent/15" />
            </button>

            {isRows ? (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4">
                <span className="truncate text-sm text-white/90">
                  {title} {index + 1}
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/70">
                    {photo.type === "video" ? t("video") : t("photos")}
                  </span>
                  {photo.youTubeId || !allowDownloads ? null : (
                    <button
                      type="button"
                      onClick={() => void onDownloadPhoto(photo, index)}
                      aria-label={`${t("downloadSelected")} ${index + 1}`}
                      className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            ) : null}

            {photo.type === "video" ? (
              <span
                /*
                 * No `backdrop-blur`. Every tile carries this badge, its
                 * checkbox and its download button, so a grid of a few hundred
                 * ran that many backdrop filters — each re-sampling what is
                 * behind it on every scrolled frame. An opaque fill over a
                 * photograph looks the same and costs nothing to composite.
                 */
                className={`pointer-events-none absolute flex items-center justify-center rounded text-white ${
                  // YouTube's own red marks a linked video as something that
                  // plays off-site, distinguishing it from an uploaded clip.
                  photo.youTubeId ? "bg-[#ff0000]/85" : "bg-black/55"
                } ${isRows ? "start-2 bottom-2 h-6 w-6" : "inset-0 m-auto h-11 w-11"}`}
              >
                <PlayIcon className={isRows ? "h-3 w-3" : "h-5 w-5"} />
              </span>
            ) : null}

            {/* Always visible, so no "select" mode is needed to start picking.
                A linked video has no file to download, so it gets no checkbox. */}
            {photo.youTubeId ? null : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelected(photo.key);
              }}
              aria-pressed={selected}
              aria-label={`${t("selectAll")} ${title} ${index + 1}`}
              className="absolute start-2 top-2 z-10"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded border text-xs transition-colors ${
                  selected
                    ? "border-black bg-black text-accent"
                    : "border-white/70 bg-black/55 text-transparent hover:bg-black/70"
                }`}
              >
                ✓
              </span>
            </button>
            )}

            {!isRows && !photo.youTubeId && allowDownloads ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void onDownloadPhoto(photo, index);
                }}
                aria-label={`${t("downloadSelected")} ${index + 1}`}
                className="touch-reveal absolute end-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded bg-black/65 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {failed === photo.key ? (
              <span className="absolute inset-x-1 bottom-1 z-10 rounded bg-black/80 px-2 py-1 text-center text-[10px] leading-tight text-accent">
                {t("downloadFailed")}
              </span>
            ) : null}
          </div>
        );
      })}

      {/*
        Watched by the observer above. It spans the grid so it is reached on
        the same scroll that exhausts the last row, in either layout.
      */}
      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className={isRows ? "h-1" : "col-span-full h-1"}
        />
      ) : null}
    </div>

    {/*
      One spinner under the grid, rather than a run of placeholder tiles inside
      it.

      The tiles were a guess at how much was coming and sat in the grid flow, so
      a page that landed short left the album ending on empty frames. A single
      indicator below the last row says "more is on the way" without implying a
      count, and it occupies the same spot every time so the eye can rest on it
      while scrolling.
    */}
    {loadingMore ? (
      <div
        className="flex items-center justify-center gap-3 py-8 text-sm text-secondary"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-accent"
        />
        {t("loadingMore")}
      </div>
    ) : null}
    </>
  );
}
