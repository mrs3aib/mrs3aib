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

  const showOverlay = showSkeleton && !loaded;

  return (
    <>
      {showOverlay ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-white/[0.05]"
        />
      ) : null}
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
          // The placeholder is a local asset that will paint; without this a
          // failed load would sit under a skeleton that never clears.
          setLoaded(true);
        }}
      />
    </>
  );
}
