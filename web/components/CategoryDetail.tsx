"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  categories,
  categoryPages,
  BOOKING_WHATSAPP_URL,
  type CategoryId,
} from "@/lib/data";
import type { ResolvedAlbum } from "@/lib/api";
import type { CmsHero } from "@/lib/cms";
import Button from "./Button";
import CategoryLink from "./CategoryLink";
import HeroMedia from "./HeroMedia";

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
  const knownId = (categories as readonly string[]).includes(id)
    ? (id as CategoryId)
    : null;
  const data = knownId ? categoryPages[knownId] : null;
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

        <div className="relative mx-auto max-w-7xl">
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="group relative block aspect-16/10 w-full cursor-pointer overflow-hidden rounded-md border border-white/10 bg-black/60 text-center shadow-2xl shadow-black/25 transition-colors duration-500 hover:border-accent/45 active:border-accent/45 focus-visible:border-accent/45 focus-visible:outline-none sm:aspect-4/3"
                  >
                    <Image
                      src={album.coverUrl}
                      alt={albumTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-active:scale-110 group-focus-visible:scale-110"
                      unoptimized={album.isLive}
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-black/5 via-black/25 to-black/95 transition-opacity duration-700 group-hover:opacity-80 group-active:opacity-80 group-focus-visible:opacity-80" />
                    <div className="absolute inset-0 bg-accent/0 transition-colors duration-700 group-hover:bg-accent/10 group-active:bg-accent/10 group-focus-visible:bg-accent/10" />
                    

                    <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-14 transition-all duration-700 sm:translate-y-4 sm:px-5 sm:pb-5 sm:pt-16 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-active:translate-y-0 sm:group-active:opacity-100 sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100">
                      <h3 className="font-display text-lg font-semibold leading-snug text-white  md:text-lg">
                        {albumTitle}
                      </h3>
                      <p className="mt-1.5 text-xs text-primary/60 sm:mt-2">
                        {albumType}
                      </p>
                      <span className="mt-3 inline-flex items-center justify-center gap-1.5 border-b border-accent pb-0.5 text-xs text-accent transition-all duration-500 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-active:translate-y-0 sm:group-active:opacity-100 sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100">
                        <CameraIcon className="h-3.5 w-3.5" />
                        {photoLabel} {ta("photos")}
                      </span>
                    </div>
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
    </>
  );
}
