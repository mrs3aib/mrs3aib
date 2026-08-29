"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedAlbum } from "@/lib/api";
import {
  WEDDINGS_CATEGORY_ID,
  type HomepageCmsContent
} from "@/lib/cms";
import { useInViewCenter } from "@/hooks/useInViewCenter";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { FadeUp } from "./Reveal";

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
 * One album card.
 *
 * Its own component because the scroll-reveal needs a ref and a hook per card,
 * which cannot live inside the parent's `.map`.
 */
function AlbumCard({
  album,
  title,
  location,
  date,
  fallbackTitle,
  photosLabel
}: {
  album: ResolvedAlbum;
  title: string;
  location?: string | null;
  date: string | null;
  fallbackTitle: string;
  photosLabel: string;
}) {
  // Hover is the reveal on pointer devices; where it does not exist, scrolling
  // the card to the centre of the screen stands in for it. `hover: none` also
  // correctly catches large tablets, which `md:` alone would misjudge.
  const isTouch = useMediaQuery("(hover: none)");
  const { ref, isCentered } = useInViewCenter<HTMLAnchorElement>(isTouch);
  const revealed = isTouch && isCentered;

  return (
    <Link
      ref={ref}
      href={`/category/${album.category ?? WEDDINGS_CATEGORY_ID}/${album.id}`}
      data-active={revealed ? "" : undefined}
      className="group relative block min-h-52 w-full overflow-hidden rounded-md border border-white/10 bg-black/60 text-start shadow-2xl shadow-black/25 transition-colors duration-500 hover:border-accent/45 active:border-accent/45 data-active:border-accent/45 focus-visible:border-accent/45 focus-visible:outline-none"
    >
      <Image
        src={album.coverUrl}
        alt={title || fallbackTitle}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-active:scale-110 group-data-active:scale-110 group-focus-visible:scale-110"
        unoptimized={album.isLive}
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/45 to-black/95 opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-active:opacity-100 group-data-active:opacity-100 group-focus-visible:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black via-black/70 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-active:opacity-100 group-data-active:opacity-100 group-focus-visible:opacity-100" />
      <div className="absolute inset-0 bg-accent/0 transition-colors duration-700 group-hover:bg-accent/10 group-active:bg-accent/10 group-data-active:bg-accent/10 group-focus-visible:bg-accent/10" />

      {date ? (
        <span className="tracking-nav absolute end-4 top-4 -translate-y-1 rounded border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] text-primary opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-active:translate-y-0 group-active:opacity-100 group-data-active:translate-y-0 group-data-active:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          {date}
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 translate-y-2 px-5 pb-5 pt-16 opacity-0 transition-all duration-700 group-hover:translate-y-0 group-hover:opacity-100 group-active:translate-y-0 group-active:opacity-100 group-data-active:translate-y-0 group-data-active:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <h3 className="font-display truncate text-base font-semibold leading-snug text-white md:text-lg">
          {title || fallbackTitle}
        </h3>
        {location ? (
          <p className="mt-2 truncate text-xs text-primary/80">{location}</p>
        ) : null}

        <span className="tracking-nav mt-3 block text-[10px] uppercase text-accent">
          {photosLabel}
        </span>
      </div>
    </Link>
  );
}

export default function LatestWeddingsClient({
  albums,
  content
}: {
  albums: ResolvedAlbum[];
  content?: HomepageCmsContent["latestWeddings"];
}) {
  const t = useTranslations("latestWeddings");
  const tCategories = useTranslations("categories");
  const tAlbums = useTranslations("albums");
  const locale = useLocale();

  if (albums.length === 0) return null;

  return (
    <section
      id="latest-weddings"
      className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28"
    >
      <FadeUp>
        <div className="mb-9 flex items-center justify-center gap-6 text-center">
          <span className="h-px w-12 bg-linear-to-r from-transparent to-accent/70" />
          <h2 className="font-display text-2xl font-semibold text-accent md:text-3xl">
            {content?.title || t("title")}
          </h2>
          <span className="h-px w-12 bg-linear-to-l from-transparent to-accent/70" />
        </div>
      </FadeUp>

      <div
        className={`grid gap-5 sm:grid-cols-2 ${
          albums.length % 4 === 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {albums.map((album, index) => {
          const itemKey = `items.${album.id}` as const;
          const title = album.title ?? tAlbums(`${itemKey}.title`);
          const location = album.isLive
            ? album.location
            : tAlbums(`${itemKey}.type`);
          const date = formatDate(album.date, locale);

          return (
            <FadeUp key={album.id} delay={(index % 4) * 0.08}>
              <AlbumCard
                album={album}
                title={title}
                location={location}
                date={date}
                fallbackTitle={tCategories(WEDDINGS_CATEGORY_ID)}
                photosLabel={t("photos", { count: album.photoCount })}
              />
            </FadeUp>
          );
        })}
      </div>

      <FadeUp delay={0.2}>
        <div className="mt-12 flex justify-center">
          <Link
            href={`/category/${WEDDINGS_CATEGORY_ID}`}
            className="inline-flex min-w-40 items-center justify-center rounded border border-white/20 bg-black/45 px-8 py-3 text-sm font-medium text-primary transition-colors duration-500 hover:border-accent hover:text-accent"
          >
            {t("viewAll")}
          </Link>
        </div>
      </FadeUp>

    </section>
  );
}
