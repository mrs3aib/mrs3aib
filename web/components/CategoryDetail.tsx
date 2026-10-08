"use client";

import { albumPath } from "@/lib/albumUrl";
import { useCallback, useRef, useState } from "react";
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

import AlbumCard from "./AlbumCard";
import AlbumPasswordModal from "./AlbumPasswordModal";
import { FadeUp } from "./Reveal";
import { ArrowRight, PlayIcon, CameraIcon, categoryIcons } from "./icons";

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
            {albums.map((album, index) => (
              <FadeUp key={album.id} delay={(index % 3) * 0.08}>
                <AlbumCard
                  album={album}
                  href={albumPath(id, album.slug ?? album.id)}
                  // A locked album asks for its password here rather than on a
                  // page the visitor would only be turned away from.
                  onClick={
                    album.requiresPassword
                      ? (e) => {
                          e.preventDefault();
                          setLocked({
                            id: album.id,
                            title: album.title ?? ta(`items.${album.id}.title`)
                          });
                        }
                      : undefined
                  }
                  onCoverFailed={album.isLive ? refreshCovers : undefined}
                  sizes="(max-width: 640px) 75vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
              </FadeUp>
            ))}
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
