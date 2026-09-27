"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import type { HomepageCmsContent } from "@/lib/cms";
import { startScroll, stopScroll } from "@/lib/scroll";
import { FadeUp } from "./Reveal";
import { Link } from "@/i18n/navigation";
import { MediaCard } from "./AlbumCard";
import { ChevronLeft, ChevronRight, CloseIcon } from "./icons";
import ResilientImage from "./ResilientImage";

/** One image inside a tile's own session. */
export type GalleryTilePhoto = {
  /** Poster thumbnail. For a video this is the only thing an `img` can show. */
  url: string;
  /**
   * Full-size source. Used only for images: on a video this is the video file
   * itself, which an `img` renders as an empty frame.
   */
  sourceUrl?: string;
  type: "image" | "video";
};

/** One resolved gallery tile, already localized by the server component. */
export type GalleryTile = {
  imageUrl: string;
  title: string;
  category: string;
  /**
   * True when `imageUrl` is a signed backend URL. Those are already sized by
   * the backend and expire, so routing them through the Next optimizer only
   * adds a proxy hop and a cache that outlives the signature.
   */
  signed?: boolean;
  /**
   * That session's own images, so opening a tile browses the project rather
   * than paging between unrelated covers. Empty for a manually typed CMS item,
   * a placeholder, or an album behind the gallery password — all of which fall
   * back to showing the cover alone.
   */
  photos?: GalleryTilePhoto[];
  /** Everything in the session, photos and videos, for the count on the card. */
  assetCount?: number;
  /** Canonical album route, for the "View project" button in the lightbox. */
  href?: string;
};

export default function Gallery({
  content,
  pickedItems
}: {
  content?: HomepageCmsContent["gallery"];
  /**
   * Sessions the admin picked in the CMS, resolved server-side. Takes
   * precedence over the manually typed `content.items`, which stay as the
   * fallback for records saved before the picker existed.
   */
  pickedItems?: GalleryTile[];
}) {
  const t = useTranslations("gallery");
  const [active, setActive] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const cmsItems = content?.items?.filter((item) => item.imageUrl) ?? [];
  const hasPicked = (pickedItems?.length ?? 0) > 0;
  /**
   * Sessions the admin picked, else items typed by hand in the CMS.
   *
   * There is deliberately no third fallback. This section once filled itself
   * with stock photographs under invented project names when both were empty,
   * which on a live site advertised work the studio never did — and, being
   * indistinguishable from real work, hid the fact that nothing had been
   * published yet.
   */
  const renderItems: GalleryTile[] = hasPicked
    ? (pickedItems as GalleryTile[])
    : cmsItems.map((item) => ({
        imageUrl: item.imageUrl,
        title: item.title || content?.title || t("title"),
        category: item.category || "",
        // CMS asset URLs are served by the backend, not generated on demand.
        signed: true
      }));
  const totalItems = renderItems.length;
  const visibleItems = showAll ? renderItems : renderItems.slice(0, 4);

  /**
   * Which image of the open tile is showing. Opening a tile starts at its
   * first image; the arrows then move within that session rather than jumping
   * to the next card, so a visitor browses one project at a time.
   */
  const [photoIndex, setPhotoIndex] = useState(0);

  const activeTile = active === null ? undefined : renderItems[active];
  /**
   * A tile with no loaded photos — a manual CMS item, a placeholder, or an
   * album behind the gallery password — still opens, showing its cover alone.
   */
  const activePhotos: GalleryTilePhoto[] = activeTile?.photos?.length
    ? activeTile.photos
    : activeTile
      ? [{ url: activeTile.imageUrl, type: "image" as const }]
      : [];
  const photoTotal = activePhotos.length;
  const currentPhoto = activePhotos[Math.min(photoIndex, photoTotal - 1)];

  /**
   * The full-size source for the open image, once it has finished decoding.
   *
   * Opening a card used to fetch a ~300KB original while showing nothing, so
   * the lightbox sat blank for as long as that took. The thumbnail is already
   * in cache from the card itself, so it paints immediately and the original
   * is layered over it only when it is ready to draw.
   */
  const [fullLoaded, setFullLoaded] = useState<string | null>(null);

  /** Poster/thumbnail: always available, always instant. */
  const previewSrc = currentPhoto?.url ?? "";
  /**
   * Only images have a larger original worth fetching — a video's `sourceUrl`
   * is the .mp4 itself, which an img cannot render.
   */
  const fullSrc =
    currentPhoto?.type === "image" && currentPhoto.sourceUrl
      ? currentPhoto.sourceUrl
      : null;

  /**
   * Warm the first image of a tile before it is opened.
   *
   * The card shows the album cover, but the lightbox opens on `photos[0]`,
   * which is a different URL and therefore uncached — so the first frame had to
   * be fetched on click. Pointing at the card is a strong enough signal to
   * fetch it early, and a browser-cached hit costs nothing when it is not.
   */
  const prefetch = useCallback((tile: GalleryTile) => {
    const first = tile.photos?.[0];
    if (!first?.url || typeof window === "undefined") return;
    const img = new window.Image();
    img.src = first.url;
  }, []);

  const open = useCallback((index: number) => {
    setActive(index);
    setPhotoIndex(0);
    // Cleared so a reopened tile starts from its thumbnail rather than trusting
    // a previous image's loaded flag.
    setFullLoaded(null);
  }, []);
  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (delta: number) => {
      setPhotoIndex((current) =>
        photoTotal === 0 ? 0 : (current + delta + photoTotal) % photoTotal
      );
    },
    [photoTotal]
  );

  useEffect(() => {
    if (active === null) {
      startScroll();
      return;
    }
    stopScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      startScroll();
    };
  }, [active, close, step]);

  /**
   * Nothing published and nothing typed in the CMS: render no section at all.
   *
   * Placed after every hook above, which must run unconditionally. An empty
   * grid would still draw the heading, the divider rules and a "View more"
   * button over a blank row — a section that looks broken rather than one that
   * is simply not filled in yet.
   */
  if (totalItems === 0) return null;

  return (
    <section
      id="gallery"
      className="relative overflow-hidden bg-base px-6 py-20 md:px-10 md:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-line to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/45 to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <FadeUp>
          <div className="mb-9 flex items-center justify-center gap-6 text-center">
            <span className="h-px w-12 bg-linear-to-r from-transparent to-accent/70" />
            <h2 className="font-display text-2xl font-semibold text-accent md:text-3xl">
              {content?.title || t("title")}
            </h2>
            <span className="h-px w-12 bg-linear-to-l from-transparent to-accent/70" />
          </div>
        </FadeUp>

        <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visibleItems.map((item, index) => (
            <FadeUp key={`${item.imageUrl}-${index}`} delay={(index % 4) * 0.08}>
              <MediaCard
                imageUrl={item.imageUrl}
                unoptimized={item.signed}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                title={item.title}
                subtitle={item.category}
                // Says what opening the card gets you, which the lightbox's
                // own "View project" button then acts on.
                countLabel={
                  item.assetCount ? t("assets", { count: item.assetCount }) : null
                }
                onClick={() => open(index)}
                onIntent={() => prefetch(item)}
              />
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.15}>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex min-w-40 items-center justify-center rounded border border-white/20 bg-black/45 px-8 py-3 text-sm font-medium text-primary transition-colors duration-500 hover:border-accent hover:text-accent"
            >
              {showAll ? t("less") : t("more")}
            </button>
          </div>
        </FadeUp>
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {active !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-base/95 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            onClick={close}
          >
            <button
              type="button"
              aria-label={t("close")}
              onClick={close}
              className="absolute end-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary"
            >
              <CloseIcon />
            </button>

            <span className="tracking-nav absolute start-6 top-8 text-xs text-secondary">
              {t("counter", {
                current: Math.min(photoIndex, photoTotal - 1) + 1,
                total: photoTotal
              })}
            </span>

            {/* Takes the visitor from browsing this project to its own page. */}
            {activeTile?.href ? (
              <Link
                href={activeTile.href}
                onClick={(e) => e.stopPropagation()}
                className="absolute start-1/2 top-6 z-10 -translate-x-1/2 rounded border border-accent/60 bg-black/50 px-5 py-2 text-xs font-medium text-accent backdrop-blur-md transition-colors hover:border-accent hover:bg-accent hover:text-base rtl:translate-x-1/2"
              >
                {t("view")}
              </Link>
            ) : null}

            {photoTotal > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={t("prev")}
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  className="absolute start-4 z-10 flex h-12 w-12 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary md:start-8"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  aria-label={t("next")}
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  className="absolute end-4 z-10 flex h-12 w-12 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary md:end-8"
                >
                  <ChevronRight />
                </button>
              </>
            ) : null}

            <motion.div
              // Keyed by both so moving within a session animates the same way
              // as opening a different one.
              key={`${active}-${photoIndex}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[78vh] w-[88vw] max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Thumbnail underneath: cached from the card, so it paints at
                  once and the frame is never blank. Blurred only while the
                  original is still arriving, so the upscale is not obvious. */}
              {previewSrc ? (
                <ResilientImage
                  key={previewSrc}
                  src={previewSrc}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="90vw"
                  className={`object-contain transition-[filter] duration-300 ${
                    fullLoaded === fullSrc ? "blur-0" : "blur-sm"
                  }`}
                  // The lightbox runs its own crossfade between this cached
                  // thumbnail and the original above it; a skeleton would sit
                  // over both and defeat the point of showing the thumbnail
                  // instantly.
                  showSkeleton={false}
                  // Backend URLs are signed and already sized; see `GalleryTile`.
                  unoptimized
                  priority
                />
              ) : null}

              {/* The original, faded in once it can actually draw. */}
              {fullSrc ? (
                <ResilientImage
                  key={fullSrc}
                  src={fullSrc}
                  alt={activeTile?.title ?? t("title")}
                  fill
                  sizes="90vw"
                  onLoad={() => setFullLoaded(fullSrc)}
                  className={`object-contain transition-opacity duration-300 ${
                    fullLoaded === fullSrc ? "opacity-100" : "opacity-0"
                  }`}
                  // Deliberately transparent until loaded so the thumbnail
                  // shows through — its own opacity is the transition here.
                  showSkeleton={false}
                  unoptimized
                  priority
                />
              ) : null}
            </motion.div>

            <div className="absolute bottom-8 start-1/2 -translate-x-1/2 text-center rtl:translate-x-1/2">
              <p className="tracking-nav text-[10px] uppercase text-accent">
                {activeTile?.category ?? ""}
              </p>
              <p className="font-display mt-1 text-sm font-medium text-primary">
                {activeTile?.title ?? t("title")}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
