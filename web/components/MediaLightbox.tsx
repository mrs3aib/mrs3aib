"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import type { ResolvedPhoto } from "@/lib/api";
import { albumPhotoUrl } from "@/lib/data";
import { ArrowRight, CloseIcon, DownloadIcon } from "./icons";

/**
 * Full-screen viewer for one gallery item, with the album's own image blurred
 * behind it.
 *
 * The backdrop is the item itself, scaled up and heavily blurred, so the view
 * takes its colour from whatever is on screen rather than sitting on flat
 * black. Videos play here with controls — the grid only ever shows their
 * poster frame.
 */
export default function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
  onDownload,
  title
}: {
  items: ResolvedPhoto[];
  /** Index into `items`, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onDownload?: (photo: ResolvedPhoto, index: number) => void;
  title: string;
}) {
  const t = useTranslations("albums");
  const photo = index === null ? null : items[index];

  const goPrevious = useCallback(() => {
    if (index === null || items.length === 0) return;
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null || items.length === 0) return;
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  // Arrow keys and Escape, the bindings a full-screen viewer is expected to have.
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, goNext, goPrevious]);

  /**
   * The viewer is opened from inside animated album panels. Those panels use
   * transforms, which can trap `position: fixed` descendants and allow the
   * album behind to keep scrolling. Locking the document while open keeps the
   * backdrop and controls pinned to the real viewport.
   */
  useEffect(() => {
    if (index === null) return;

    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      body.style.touchAction = previous.bodyTouchAction;
    };
  }, [index]);

  // Full-size source where there is one; placeholders can be re-requested at
  // any size, and the grid thumbnail is the last resort.
  const fullUrl = photo
    ? photo.seed
      ? albumPhotoUrl(photo.seed, 1800, 1400)
      : (photo.sourceUrl ?? photo.url)
    : "";

  const content = (
    <AnimatePresence>
      {photo ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[110] flex h-[100dvh] w-screen items-center justify-center overflow-hidden"
          role="dialog"
          aria-modal="true"
          data-lenis-prevent
          onClick={onClose}
        >
          {/* Blurred backdrop, built from the item on show. `scale` hides the
              soft edges the blur leaves at the boundaries. */}
          <div className="absolute inset-0 overflow-hidden bg-black">
            <img
              src={photo.url}
              alt=""
              aria-hidden="true"
              className="h-full w-full scale-125 object-cover opacity-40 blur-3xl"
            />
            <div className="absolute inset-0 bg-black/55" />
          </div>

          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="absolute end-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

          {/* A linked video has no file to save — offering the button would
              promise a download that cannot happen. */}
          {onDownload && !photo.youTubeId ? (
            <button
              type="button"
              aria-label={t("downloadSelected")}
              onClick={(e) => {
                e.stopPropagation();
                onDownload(photo, index as number);
              }}
              className="absolute end-20 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75"
            >
              <DownloadIcon className="h-5 w-5" />
            </button>
          ) : null}

          {items.length > 1 ? (
            <>
              {/* `start`/`end` rather than left/right so the controls follow the
                  reading direction in Arabic. */}
              <button
                type="button"
                aria-label={t("previous")}
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevious();
                }}
                className="absolute start-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75 md:start-6"
              >
                {/* `ArrowRight` already mirrors itself in RTL, so this only
                    needs the static half-turn that makes it point backwards. */}
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
              <button
                type="button"
                aria-label={t("next")}
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute end-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75 md:end-6"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <motion.div
            key={photo.key}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            // Clicks inside must not close the viewer — video controls live here.
            onClick={(e) => e.stopPropagation()}
            className="relative z-[1] flex max-h-[calc(100dvh-7rem)] w-[92%] max-w-6xl items-center justify-center"
          >
            {photo.youTubeId ? (
              // A linked video is played by YouTube itself — we hold no file
              // for it. `origin` keeps the embed from reporting our page to
              // YouTube's referrer analytics more than it needs to.
              <div className="aspect-video w-full overflow-hidden rounded-lg shadow-2xl shadow-black/60">
                <iframe
                  key={photo.key}
                  src={`https://www.youtube-nocookie.com/embed/${photo.youTubeId}?autoplay=1&rel=0`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
            ) : photo.type === "video" ? (
              <video
                // Keyed so switching items mounts a fresh element rather than
                // leaving the previous video's buffer playing underneath.
                key={photo.key}
                src={photo.sourceUrl ?? photo.url}
                poster={photo.url}
                controls
                autoPlay
                playsInline
                className="max-h-[calc(100dvh-7rem)] w-auto max-w-full rounded-lg shadow-2xl shadow-black/60"
              />
            ) : (
              <img
                src={fullUrl}
                alt={title}
                className="max-h-[calc(100dvh-7rem)] w-auto max-w-full rounded-lg object-contain shadow-2xl shadow-black/60"
              />
            )}
          </motion.div>

          <span className="absolute bottom-5 z-10 rounded-full bg-black/55 px-4 py-1.5 text-xs text-white backdrop-blur-md">
            {(index as number) + 1} / {items.length}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return typeof document === "undefined" ? content : createPortal(content, document.body);
}
