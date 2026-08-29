"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { galleryItems, galleryUrl } from "@/lib/data";
import type { HomepageCmsContent } from "@/lib/cms";
import { startScroll, stopScroll } from "@/lib/scroll";
import { FadeUp } from "./Reveal";
import { ChevronLeft, ChevronRight, CloseIcon } from "./icons";

/** One resolved gallery tile, already localized by the server component. */
export type GalleryTile = {
  imageUrl: string;
  title: string;
  category: string;
  /**
   * True when `imageUrl` is a signed backend URL. Those are already sized by
   * the backend and expire, so routing them through the Next optimizer only
   * adds a proxy hop and a cache that outlives the signature.
   */
  signed?: boolean;
};

export default function Gallery({
  content,
  pickedItems
}: {
  content?: HomepageCmsContent["gallery"];
  /**
   * Sessions the admin picked in the CMS, resolved server-side. Takes
   * precedence over the manually typed `content.items`, which stay as the
   * fallback for records saved before the picker existed.
   */
  pickedItems?: GalleryTile[];
}) {
  const t = useTranslations("gallery");
  const tp = useTranslations("projects");
  const [active, setActive] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const cmsItems = content?.items?.filter((item) => item.imageUrl) ?? [];
  const hasPicked = (pickedItems?.length ?? 0) > 0;
  const hasCmsItems = cmsItems.length > 0;
  const renderItems = hasPicked
    ? (pickedItems as GalleryTile[])
    : hasCmsItems
    ? cmsItems.map((item) => ({
        imageUrl: item.imageUrl,
        title: item.title || content?.title || t("title"),
        category: item.category || "",
        // CMS asset URLs are served by the backend, not generated on demand.
        signed: true
      }))
    : galleryItems.map((item) => ({
        imageUrl: galleryUrl(item),
        title: tp(`items.${item.projectId}.title`),
        category: tp(`items.${item.projectId}.category`),
        signed: false
      }));
  const totalItems = renderItems.length;
  const visibleItems = showAll ? renderItems : renderItems.slice(0, 4);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback((delta: number) => {
    setActive((current) =>
      current === null
        ? null
        : (current + delta + totalItems) % totalItems
    );
  }, [totalItems]);

  useEffect(() => {
    if (active === null) {
      startScroll();
      return;
    }
    stopScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      startScroll();
    };
  }, [active, close, step]);

  return (
    <section
      id="gallery"
      className="relative overflow-hidden bg-base px-6 py-20 md:px-10 md:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-line to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/45 to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <FadeUp>
          <div className="mb-9 flex items-center justify-center gap-6 text-center">
            <span className="h-px w-12 bg-linear-to-r from-transparent to-accent/70" />
            <h2 className="font-display text-2xl font-semibold text-accent md:text-3xl">
              {content?.title || t("title")}
            </h2>
            <span className="h-px w-12 bg-linear-to-l from-transparent to-accent/70" />
          </div>
        </FadeUp>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visibleItems.map((item, index) => (
            <FadeUp key={`${item.imageUrl}-${index}`} delay={(index % 4) * 0.08}>
              <button
                type="button"
                onClick={() => setActive(index)}
                className="group relative block min-h-52 w-full overflow-hidden rounded-md border border-white/10 bg-black/60 text-center shadow-2xl shadow-black/25 transition-colors duration-500 hover:border-accent/45 active:border-accent/45 focus-visible:border-accent/45 focus-visible:outline-none"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-active:scale-110 group-focus-visible:scale-110"
                  unoptimized={item.signed}
                />
                <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/20 to-black/90 transition-opacity duration-700 group-hover:opacity-80 group-active:opacity-80 group-focus-visible:opacity-80" />
                <div className="absolute inset-0 bg-accent/0 transition-colors duration-700 group-hover:bg-accent/10 group-active:bg-accent/10 group-focus-visible:bg-accent/10" />

                <div className="absolute inset-x-0 bottom-0 translate-y-1 px-5 pb-5 pt-16 transition-transform duration-700 group-hover:translate-y-0 group-active:translate-y-0 group-focus-visible:translate-y-0">
                  <h3 className="font-display text-base font-semibold leading-snug text-white md:text-lg">
                    {item.title}
                  </h3>
                  {item.category ? (
                    <p className="mt-2 text-xs text-primary/80">{item.category}</p>
                  ) : null}
                  <span className="touch-reveal mt-3 inline-block translate-y-2 border-b border-accent pb-0.5 text-xs text-accent opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-active:translate-y-0 group-active:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                    {t("view")}
                  </span>
                </div>
              </button>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.15}>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex min-w-40 items-center justify-center rounded border border-white/20 bg-black/45 px-8 py-3 text-sm font-medium text-primary transition-colors duration-500 hover:border-accent hover:text-accent"
            >
              {showAll ? t("less") : t("more")}
            </button>
          </div>
        </FadeUp>
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {active !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-base/95 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            onClick={close}
          >
            <button
              type="button"
              aria-label={t("close")}
              onClick={close}
              className="absolute end-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary"
            >
              <CloseIcon />
            </button>

            <span className="tracking-nav absolute start-6 top-8 text-xs text-secondary">
              {t("counter", {
                current: active + 1,
                total: totalItems
              })}
            </span>

            <button
              type="button"
              aria-label={t("prev")}
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute start-4 z-10 flex h-12 w-12 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary md:start-8"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label={t("next")}
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute end-4 z-10 flex h-12 w-12 items-center justify-center rounded border border-white/15 text-secondary transition-colors hover:border-white hover:text-primary md:end-8"
            >
              <ChevronRight />
            </button>

            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[78vh] w-[88vw] max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={
                  renderItems[active]?.imageUrl ?? renderItems[0]?.imageUrl
                }
                alt={renderItems[active]?.title ?? t("title")}
                fill
                sizes="90vw"
                className="object-contain"
                unoptimized={renderItems[active]?.signed}
              />
            </motion.div>

            <div className="absolute bottom-8 start-1/2 -translate-x-1/2 text-center rtl:translate-x-1/2">
              <p className="tracking-nav text-[10px] uppercase text-accent">
                {renderItems[active]?.category ?? ""}
              </p>
              <p className="font-display mt-1 text-sm font-medium text-primary">
                {renderItems[active]?.title ?? t("title")}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
