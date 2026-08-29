"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The background media behind a hero, in whichever form the admin chose.
 *
 * The CMS stores `mediaType` alongside the URL, so an admin who picks "video"
 * gets a `<video>` and one who picks "image" gets a Next `<Image>`. Two things
 * beyond that switch matter in practice:
 *
 *  - Autoplay is not guaranteed. Browsers block it outright when the device is
 *    in low-power mode, and a muted-autoplay policy can still reject the play()
 *    promise. When that happens the element would sit frozen on frame one, so
 *    the poster (or the fallback image) is kept visible underneath instead of
 *    showing a dead black rectangle.
 *  - A broken or unsupported URL should not blank the hero. `onError` swaps to
 *    the fallback image, which is the same asset the page would have used had
 *    the CMS never been filled in.
 */
export default function HeroMedia({
  mediaType,
  mediaUrl,
  posterUrl,
  fallbackImage,
  alt = "",
  className
}: {
  mediaType: "image" | "video";
  mediaUrl: string;
  posterUrl?: string;
  /** Shown when the video cannot load, and used when `mediaType` is "image". */
  fallbackImage: string;
  alt?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  // Until the video actually renders a frame, the still underneath stays up —
  // this is what prevents the blank-hero flash on a blocked autoplay.
  const [playing, setPlaying] = useState(false);

  const isVideo = mediaType === "video" && !failed;

  // A changed URL means a different asset: clear the old element's state so a
  // working video after a broken one is not left hidden behind the fallback.
  useEffect(() => {
    setFailed(false);
    setPlaying(false);
  }, [mediaUrl]);

  useEffect(() => {
    if (!isVideo) return;
    const video = videoRef.current;
    if (!video) return;

    // Chrome and Safari reject play() with an unhandled rejection unless it is
    // caught. A rejection is not fatal here — the still image is already
    // showing — so it is swallowed deliberately.
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => setPlaying(false));
    }
  }, [isVideo, mediaUrl]);

  if (!isVideo) {
    return (
      <Image
        src={mediaType === "image" ? mediaUrl : fallbackImage}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className={className}
        // A CMS URL can 404 or point at a host Next cannot optimise; falling
        // back keeps the hero from rendering as an empty box.
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <>
      {/* Sits behind the video and is revealed whenever playback has not
          started, so the hero always has something on screen.

          It stays mounted and fades out rather than unmounting on the first
          frame: removing it in the same render that reveals the video left a
          gap where neither was painted, which is the flash a visitor sees when
          the hero remounts on a client-side navigation. */}
      <Image
        src={posterUrl || fallbackImage}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className={`${className ?? ""} transition-opacity duration-700 ${
          playing ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden={playing}
      />
      <video
        ref={videoRef}
        className={className}
        src={mediaUrl}
        // Falls back to the same still the layer underneath shows, so the
        // element itself is never a black rectangle while it buffers — the CMS
        // leaves `posterUrl` empty unless an admin uploads one.
        poster={posterUrl || fallbackImage}
        autoPlay
        muted
        loop
        playsInline
        // `metadata`, not `auto`: the hero video is large, and `auto` makes the
        // browser pull as much of it as it can the moment the element mounts.
        // Autoplay still starts playback as soon as enough has buffered, but a
        // return to this page no longer competes with the rest of the load.
        preload="metadata"
        // `playing` flips on the first painted frame rather than on `play`,
        // which fires before there is anything to show.
        onPlaying={() => setPlaying(true)}
        onError={() => setFailed(true)}
      />
    </>
  );
}
