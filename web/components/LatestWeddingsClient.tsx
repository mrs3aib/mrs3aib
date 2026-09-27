"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedAlbum } from "@/lib/api";
import {
  WEDDINGS_CATEGORY_ID,
  type HomepageCmsContent
} from "@/lib/cms";
import AlbumCard from "./AlbumCard";
import { FadeUp } from "./Reveal";

export default function LatestWeddingsClient({
  albums,
  content
}: {
  albums: ResolvedAlbum[];
  content?: HomepageCmsContent["latestWeddings"];
}) {
  const t = useTranslations("latestWeddings");

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
        className={`grid items-start gap-5 sm:grid-cols-2 ${
          albums.length % 4 === 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {albums.map((album, index) => (
          <FadeUp key={album.id} delay={(index % 4) * 0.08}>
            <AlbumCard
              album={album}
              href={`/category/${album.category ?? WEDDINGS_CATEGORY_ID}/${album.id}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              showDate
            />
          </FadeUp>
        ))}
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
