"use client";

import type { MouseEvent } from "react";
import { useRef } from "react";
import { useInView } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedAlbum } from "@/lib/api";
import { CameraIcon, LockIcon } from "./icons";
import ResilientImage from "./ResilientImage";

function formatDate(value: string, locale: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

/**
 * The card every album listing on the site draws — the home page's latest
 * work, its "our work" gallery, and the category pages. Each used to keep its
 * own copy, and changes to one never reached the others.
 *
 * This is the design alone, fed plain values, so it serves both an album
 * record and a gallery tile. It is a link when given `href`, otherwise a
 * button for `onClick`.
 *
 * The details panel opens in the card's own space, growing the card smoothly
 * and pushing whatever is below — the next row, or the footer — down with it.
 * With a mouse it opens while the card is hovered or focused. A touch screen
 * has no hover, so there it opens once the card has scrolled mostly into view.
 * Keyed on the pointer, not the screen width, so a tablet gets the touch
 * behaviour too.
 */
export function MediaCard({
  imageUrl,
  previewDataUrl,
  unoptimized,
  onCoverFailed,
  sizes,
  title,
  subtitle,
  date,
  countLabel,
  locked,
  lockedLabel,
  href,
  onClick,
  onIntent
}: {
  imageUrl: string;
  /** Blur-up placeholder shown until the cover decodes. */
  previewDataUrl?: string;
  /** Signed backend URLs skip the Next optimizer; see `ResilientImage`. */
  unoptimized?: boolean;
  /** Called when the cover fails to load — e.g. to refresh expired URLs. */
  onCoverFailed?: () => void;
  /** The image's `sizes`, which depends on the grid the card sits in. */
  sizes: string;
  title: string;
  subtitle?: string | null;
  date?: string | null;
  /** e.g. "24 photos". */
  countLabel?: string | null;
  /** Shows a lock, so a password prompt is expected rather than a surprise. */
  locked?: boolean;
  lockedLabel?: string;
  href?: string;
  /** Runs on click; with `href`, call `preventDefault` to stay on the page. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** The visitor is about to open the card — hovered, focused or pressed. */
  onIntent?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const body = (
    <div
      ref={ref}
      className="overflow-hidden rounded-md border border-white/10 bg-black/60 shadow-2xl shadow-black/25 transition-colors duration-500 group-hover:border-accent/45 group-active:border-accent/45 group-focus-visible:border-accent/45"
    >
      {/* Wide, to match the landscape covers these albums are shot for; a
          squarer frame cropped the sides off them. */}
      <div className="relative aspect-16/10 w-full overflow-hidden">
        <ResilientImage
          src={imageUrl}
          alt={title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-active:scale-110 group-focus-visible:scale-110"
          unoptimized={unoptimized}
          {...(previewDataUrl ? { previewDataUrl } : {})}
          onFailed={onCoverFailed}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/5 via-black/25 to-black/95 transition-opacity duration-700 group-hover:opacity-80 group-active:opacity-80 group-focus-visible:opacity-80" />
        <div className="absolute inset-0 bg-accent/0 transition-colors duration-700 group-hover:bg-accent/10 group-active:bg-accent/10 group-focus-visible:bg-accent/10" />

        {locked ? (
          <span
            title={lockedLabel}
            className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-accent backdrop-blur-sm"
          >
            <LockIcon className="h-4 w-4" />
            {lockedLabel ? <span className="sr-only">{lockedLabel}</span> : null}
          </span>
        ) : null}
      </div>

      {/* Animating grid rows from 0fr to 1fr grows the panel to its natural
          height, which a height transition cannot do without a fixed value. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
          inView ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        } pointer-fine:grid-rows-[0fr] pointer-fine:opacity-0 pointer-fine:group-hover:grid-rows-[1fr] pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-visible:grid-rows-[1fr] pointer-fine:group-focus-visible:opacity-100`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-white/10 px-4 py-4 transition-colors duration-500 group-hover:border-accent/45 group-focus-visible:border-accent/45 sm:px-5">
            <h3 className="font-display text-lg font-semibold leading-snug text-white transition-colors duration-500 group-hover:text-accent group-active:text-accent group-focus-visible:text-accent">
              {title}
            </h3>
            {date ? <p className="mt-1 text-xs text-primary/50">{date}</p> : null}
            {subtitle || countLabel ? (
              <div className="mt-2 flex items-center justify-center gap-3 text-xs text-primary/60">
                {subtitle ? <span className="truncate">{subtitle}</span> : null}
                {subtitle && countLabel ? (
                  <span aria-hidden="true" className="h-3 w-px bg-white/20" />
                ) : null}
                {countLabel ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-accent">
                    <CameraIcon className="h-3.5 w-3.5" />
                    {countLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const shared = {
    onClick,
    onMouseEnter: onIntent,
    onFocus: onIntent,
    // Touch has no hover; the press lands well before the click.
    onTouchStart: onIntent,
    className:
      "group relative block w-full cursor-pointer text-center focus-visible:outline-none"
  };

  return href ? (
    <Link href={href} {...shared}>
      {body}
    </Link>
  ) : (
    <button type="button" {...shared}>
      {body}
    </button>
  );
}

/** A `MediaCard` for an album record — the home page and category listings. */
export default function AlbumCard({
  album,
  href,
  onClick,
  onCoverFailed,
  sizes,
  showDate = false
}: {
  album: ResolvedAlbum;
  href: string;
  /** Runs before navigation; call `preventDefault` to stay on the page. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onCoverFailed?: () => void;
  sizes: string;
  /** Adds the event date to the details. */
  showDate?: boolean;
}) {
  const t = useTranslations("albums");
  const locale = useLocale();

  // Live sessions carry their own title and location; placeholder albums
  // still read theirs from the translation files.
  const itemKey = `items.${album.id}` as const;

  return (
    <MediaCard
      imageUrl={album.coverUrl}
      previewDataUrl={album.coverPreviewDataUrl}
      unoptimized={album.isLive}
      onCoverFailed={onCoverFailed}
      sizes={sizes}
      title={album.title ?? t(`${itemKey}.title`)}
      subtitle={album.isLive ? album.location : t(`${itemKey}.type`)}
      date={showDate ? formatDate(album.date, locale) : null}
      // The listing's count, so the card is right on its first render — the
      // album's media is only loaded once it is opened.
      countLabel={`${album.photoCount} ${t("photos")}`}
      locked={album.requiresPassword}
      lockedLabel={t("locked")}
      href={href}
      onClick={onClick}
    />
  );
}
