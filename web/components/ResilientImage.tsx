"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

const DEFAULT_FALLBACK = "/images/placeHolder.png";

type ResilientImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  fallbackSrc?: string;
  /**
   * Set false for images that are never on a card — a full-bleed hero, say —
   * where a shimmering block is more conspicuous than the image arriving.
   */
  showSkeleton?: boolean;
  /**
   * Whether a load failure may fall back to the studio placeholder.
   *
   * Off by default, and deliberately so. A placeholder photograph among real
   * work reads as a picture that belongs there — visitors took it for a broken
   * or duplicated shot, and a page whose signed URLs had all expired turned
   * into a wall of studio artwork presented as the album. An empty frame says
   * "not loaded" without claiming to be content.
   *
   * Opt in only where a frame must never be empty and the stand-in cannot be
   * mistaken for real content.
   */
  allowPlaceholderOnError?: boolean;
   /**
   * Animate the empty frame with a sweeping highlight while it waits.
   *
   * Opt-in, and meant only for the handful of frames a page shows at once — a
   * hero, a row of cards. A grid of hundreds must keep the flat fill: every
   * pending tile animating at once repaints the scroll area on every frame.
   */
  shimmer?: boolean;
  /**
   * A tiny inlined image of this same photograph, painted blurred and upscaled
   * until the real one decodes.
   *
   * Given one, the frame carries the picture's own colour and composition from
   * the first paint instead of a grey block, which is what makes a long grid
   * read as filling in rather than popping in. Without one the plain skeleton
   * still applies, so this is safe to leave unset.
   */
  previewDataUrl?: string;
};

/**
 * Dynamic media can briefly fail while a storage object becomes available or a
 * mobile connection changes. Retry the exact signed URL once, then preserve
 * the card's layout with the studio placeholder instead of exposing alt text.
 *
 * Until the bytes are decoded a skeleton covers the frame. A progressive JPEG
 * painting band by band draws the eye to a half-built picture and makes a fast
 * connection look slow; a single placeholder that swaps to the finished image
 * reads as one step instead of a dozen.
 */
export default function ResilientImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  showSkeleton = true,
  allowPlaceholderOnError = false,
  shimmer = false,
  previewDataUrl,
  className,
  onLoad,
  ...props
}: ResilientImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const usableSrc = src || fallbackSrc;

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    setLoaded(false);
  }, [src]);

  /**
   * A cached image can finish decoding before React attaches `onLoad`, and the
   * event never fires — leaving the skeleton over a picture that is already
   * there. `complete` is the browser's own record of that, so it catches the
   * images that beat the listener.
   */
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [attempt, failed]);

  const imageSrc = failed
    ? fallbackSrc
    : attempt === 0
      ? usableSrc
      // A fragment is never sent to R2, so this retries the same signed URL
      // without invalidating its signature while forcing a new image element.
      : `${usableSrc}#image-retry`;

  // A failed image renders nothing but the skeleton, so the frame stays empty
  // rather than showing stand-in artwork. A missing `src` takes the same path:
  // a caller that has no image to show is in the same position as one whose
  // image would not load, and the studio placeholder would read as a real
  // photograph either way.
  const skeletonInstead = !allowPlaceholderOnError && (failed || !src);
  const showOverlay = showSkeleton && (!loaded || skeletonInstead);

  return (
    <>
      {showOverlay ? (
        /*
         * The blur-up preview when there is one, a flat fill otherwise.
         *
         * Either way this is a static layer, never `animate-pulse`. In a grid
         * every unloaded tile runs this overlay at once, and a few hundred
         * infinite CSS animations repaint on every frame — the scroll stutter
         * that costs far more than the shimmer was worth.
         *
         * The preview is a ~20px image stretched over the whole frame, so it
         * arrives already blurred by the upscale; `blur` on top only smooths
         * the pixel edges, and a small radius is enough. It is not shown for a
         * failed tile: standing in for a photograph that is not coming would
         * leave a permanent smear that reads as a broken image.
         */
        previewDataUrl && !skeletonInstead ? (
          <img
            src={previewDataUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full scale-105 object-cover blur-md"
          />
        ) : (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-10 overflow-hidden bg-white/[0.05] ${
              // Only while something is still expected. A frame that has given
              // up keeps the flat fill: a sweep that never resolves reads as a
              // page still working, and the visitor waits for nothing.
              shimmer && !skeletonInstead ? "image-shimmer" : ""
            }`}
          />
        )
      ) : null}
      {skeletonInstead ? null : (
      <Image
        {...props}
        ref={imgRef}
        src={imageSrc}
        // Fading in rather than appearing avoids trading a top-to-bottom wipe
        // for a hard cut. The skeleton sits underneath until this reaches full
        // opacity, so nothing shows through mid-fade.
        className={`${className ?? ""} transition-opacity duration-500 ${
          showOverlay ? "opacity-0" : "opacity-100"
        }`}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={() => {
          if (!failed && src && attempt === 0) {
            setAttempt(1);
            return;
          }
          setFailed(true);
          // A placeholder, where one is allowed, is a local asset that will
          // paint; without this a failed load would sit under a skeleton that
          // never clears.
          setLoaded(true);
        }}
      />
      )}
    </>
  );
}
