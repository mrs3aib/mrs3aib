"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  categories,
  BOOKING_WHATSAPP_URL,
  type CategoryId,
} from "@/lib/data";
import type { ResolvedAlbum } from "@/lib/api";
import type { CmsHero } from "@/lib/cms";
import Button from "./Button";
import CategoryLink from "./CategoryLink";
import HeroMedia from "./HeroMedia";
import ResilientImage from "./ResilientImage";

import AlbumPasswordModal from "./AlbumPasswordModal";
import { FadeUp } from "./Reveal";
import { ArrowRight, PlayIcon, CameraIcon, LockIcon, categoryIcons } from "./icons";

export default function CategoryDetail({
  id,
  content,
  categoryItems,
  categoryLabel,
  albums = []
}: {
  id: string;
  content?: CmsHero;
  categoryItems: { id: string; label: string }[];
  categoryLabel?: string;
  albums?: ResolvedAlbum[];
}) {
  const t = useTranslations("categoryPages");
  const tc = useTranslations("categories");
  const ta = useTranslations("albums");
  /**
   * The locked album a visitor just tried to open. Holding the title too keeps
   * the modal's heading correct without looking the album up again.
   */
  const [locked, setLocked] = useState<{ id: string; title: string } | null>(null);
  const router = useRouter();
  const refreshedForCovers = useRef(false);
  /**
   * Re-sign the covers when one will not load.
   *
   * The server renders fresh signatures, but the browser's back button and
   * Next's router cache can put an older payload back on screen, and by then
   * its signed URLs may have lapsed. One refresh fetches this page again with
   * new URLs; the new `src` resets each card's image. Only once per visit, so a
   * cover that is genuinely missing cannot loop the page.
   */
  const refreshCovers = useCallback(() => {
    if (refreshedForCovers.current) return;
    refreshedForCovers.current = true;
    router.refresh();
  }, [router]);
  const knownId = (categories as readonly string[]).includes(id)
    ? (id as CategoryId)
    : null;
  const Icon = knownId ? categoryIcons[knownId] : CameraIcon;
  const others = categoryItems.filter((category) => category.id !== id);
  const hasCmsMedia = Boolean(content?.mediaUrl);
  // CMS media always wins. Until a category hero is configured, use the shared
  // studio placeholder rather than a mismatched stock image.
  const fallbackImage = "/images/placeHolder.png";
  const mediaUrl = hasCmsMedia ? (content?.mediaUrl as string) : fallbackImage;
  const mediaType = hasCmsMedia ? (content?.mediaType ?? "image") : "image";
  const fallbackLabel = categoryLabel || (knownId ? tc(knownId) : id);
  const title = content?.title || (knownId ? t(`items.${knownId}.title`) : fallbackLabel);
  const kicker = content?.kicker || (knownId ? t(`items.${knownId}.kicker`) : fallbackLabel);
  const subtitle =
    content?.subtitle ||
    (knownId ? t(`items.${knownId}.subtitle`) : "Explore this gallery category.");
  const cta = content?.cta || t("cta");

  return (
    <>
      <section className="relative flex min-h-144 items-end overflow-hidden pt-32 sm:h-[78vh] sm:min-h-150 md:pt-36">
        <HeroMedia
          mediaType={mediaType}
          mediaUrl={mediaUrl}
          posterUrl={content?.posterUrl}
          fallbackImage={fallbackImage}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-base via-base/50 to-base/10" />

        <div className="relative mx-auto w-full max-w-7xl px-6 pb-10 md:px-10 md:pb-14 lg:pb-16">
          <FadeUp>
            <Link
              href="/"
              className="tracking-nav mb-7 inline-flex items-center gap-2 text-xs font-medium uppercase text-secondary transition-colors hover:text-primary"
            >
              <ArrowRight className="h-4 w-4 rotate-180 rtl:rotate-0" />
              {t("backToHome")}
            </Link>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="mb-5 flex items-center gap-3 text-accent">
              <Icon className="h-6 w-6" />
              <span className="tracking-nav text-md font-medium uppercase">
                {kicker}
              </span>
            </div>
          </FadeUp>
          <FadeUp delay={0.2}>
            <h1 className="tracking-hero font-display max-w-3xl text-4xl font-semibold leading-tight text-primary md:text-6xl lg:text-7xl">
              {title}
            </h1>
          </FadeUp>
          <FadeUp delay={0.3}>
            <p className="mt-5 max-w-lg leading-relaxed text-secondary md:text-lg">
              {subtitle}
            </p>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="mt-8">
              <Button href={BOOKING_WHATSAPP_URL} className="px-7 py-3 text-sm">
                {cta}
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>

      

      <section className="relative overflow-hidden border-y border-line bg-base px-5 py-12 md:px-10 md:py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-line to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/45 to-transparent" />

        <div className="relative mx-auto max-w-[90rem]">
          <FadeUp>
            <div className="mb-7 flex items-center justify-center gap-4 text-center md:mb-9 md:gap-6">
              <span className="h-px w-12 bg-linear-to-r from-transparent to-accent/70" />
              <h2 className="font-display text-2xl font-semibold text-accent md:text-3xl">
                {t("gallery")}
              </h2>
              <span className="h-px w-12 bg-linear-to-l from-transparent to-accent/70" />
            </div>
            
          </FadeUp>

          {/*
            A category with nothing published says so, rather than rendering an
            empty grid that reads as a broken page. Demo albums used to fill
            this space, which advertised work the studio had not done.
          */}
          {albums.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/70">{t("empty")}</p>
          ) : null}

          <div className="mx-auto grid w-[75%] items-start gap-5 sm:w-full sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {albums.map((album, index) => {
              const itemKey = `items.${album.id}` as const;
              // Live sessions carry their own title/type; placeholder albums
              // still read theirs from the translation files.
              const albumTitle = album.title ?? ta(`${itemKey}.title`);
              const albumType = album.isLive
                ? album.location
                : ta(`${itemKey}.type`);
              // Live card media is loaded only after the modal opens. Use the
              // count returned with the session listing so the card is correct
              // on its first render.
              const photoLabel = album.photoCount;
              return (
                <FadeUp key={album.id} delay={(index % 3) * 0.08}>
                  <Link
                    href={`/category/${id}/${album.id}`}
                    // A locked album asks for its password here rather than on
                    // a page the visitor would only be turned away from.
                    onClick={
                      album.requiresPassword
                        ? (e) => {
                            e.preventDefault();
                            setLocked({ id: album.id, title: albumTitle });
                          }
                        : undefined
                    }
                    className="group relative block w-full cursor-pointer text-center focus-visible:outline-none"
                  >
                    <AlbumCardBody
                      media={
                        <>
                          <ResilientImage
                            src={album.coverUrl}
                            alt={albumTitle}
                            fill
                            sizes="(max-width: 640px) 75vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-active:scale-110 group-focus-visible:scale-110"
                            unoptimized={album.isLive}
                            {...(album.coverPreviewDataUrl
                              ? { previewDataUrl: album.coverPreviewDataUrl }
                              : {})}
                            onFailed={album.isLive ? refreshCovers : undefined}
                          />
                          <div className="absolute inset-0 bg-linear-to-b from-black/5 via-black/25 to-black/95 transition-opacity duration-700 group-hover:opacity-80 group-active:opacity-80 group-focus-visible:opacity-80" />
                          <div className="absolute inset-0 bg-accent/0 transition-colors duration-700 group-hover:bg-accent/10 group-active:bg-accent/10 group-focus-visible:bg-accent/10" />

                          {/* Says the album is gated before the click, so the prompt
                              is expected rather than a surprise. */}
                          {album.requiresPassword ? (
                            <span
                              title={ta("locked")}
                              className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-accent backdrop-blur-sm"
                            >
                              <LockIcon className="h-4 w-4" />
                              <span className="sr-only">{ta("locked")}</span>
                            </span>
                          ) : null}
                        </>
                      }
                      details={
                        <>
                          <h3 className="font-display text-lg font-semibold leading-snug text-white transition-colors duration-500 group-hover:text-accent group-active:text-accent group-focus-visible:text-accent">
                            {albumTitle}
                          </h3>
                          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-primary/60">
                            {albumType ? (
                              <>
                                <span className="truncate">{albumType}</span>
                                <span aria-hidden="true" className="h-3 w-px bg-white/20" />
                              </>
                            ) : null}
                            <span className="inline-flex shrink-0 items-center gap-1.5 text-accent">
                              <CameraIcon className="h-3.5 w-3.5" />
                              {photoLabel} {ta("photos")}
                            </span>
                          </div>
                        </>
                      }
                    />
                  </Link>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <FadeUp>
          <p className="tracking-nav mb-8 text-xs font-medium uppercase text-accent">
            {t("otherCategories")}
          </p>
        </FadeUp>
        <div className="grid grid-cols-2 divide-x divide-y divide-line border border-line rtl:divide-x-reverse sm:grid-cols-3 md:grid-cols-5">
          {others.map((otherId, i) => (
            <FadeUp key={otherId.id} delay={(i % 4) * 0.06}>
              <CategoryLink id={otherId.id} label={otherId.label} className="py-8" />
            </FadeUp>
          ))}
        </div>
      </section>

      {locked ? (
        <AlbumPasswordModal
          category={id as CategoryId}
          albumId={locked.id}
          title={locked.title}
          categoryLabel={fallbackLabel}
          onClose={() => setLocked(null)}
        />
      ) : null}
    </>
  );
}

/**
 * An album card: the photo, and its details opening beneath it.
 *
 * The panel opens in the card's own space, growing the card smoothly and
 * pushing whatever is below — the next row, or the footer — down with it. It
 * used to drop down over the content below instead, and covered it.
 *
 * With a mouse it opens while the card is hovered or focused. A touch screen
 * has no hover, so there it opens once the card has scrolled mostly into view.
 * Keyed on the pointer, not the screen width, so a tablet gets the touch
 * behaviour too.
 */
function AlbumCardBody({
  media,
  details
}: {
  media: ReactNode;
  details: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-md border border-white/10 bg-black/60 shadow-2xl shadow-black/25 transition-colors duration-500 group-hover:border-accent/45 group-active:border-accent/45 group-focus-visible:border-accent/45"
    >
      {/* Wide, to match the landscape covers these albums are shot for; a
          squarer frame cropped the sides off them. */}
      <div className="relative aspect-16/10 w-full overflow-hidden">
        {media}
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
            {details}
          </div>
        </div>
      </div>
    </div>
  );
}
