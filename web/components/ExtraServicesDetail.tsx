"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BOOKING_WHATSAPP_URL, extraServiceKeys } from "@/lib/data";
import {
  extraServiceTextFor,
  extraServicesTextFor,
  type CmsHero,
  type CmsExtraServices
} from "@/lib/cms";
import Button from "./Button";
import { ArrowRight } from "./icons";
import { FadeUp } from "./Reveal";
import ResilientImage from "./ResilientImage";
import HeroMedia from "./HeroMedia";

function ServicesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3.5c.6 3.9 1.7 5 5.6 5.6-3.9.6-5 1.7-5.6 5.6-.6-3.9-1.7-5-5.6-5.6 3.9-.6 5-1.7 5.6-5.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 14.4c.3 1.9.8 2.4 2.7 2.7-1.9.3-2.4.8-2.7 2.7-.3-1.9-.8-2.4-2.7-2.7 1.9-.3 2.4-.8 2.7-2.7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExtraServicesDetail({
  content,
  hero,
  locale
}: {
  /** CMS record for this page. Absent means "use the built-in copy". */
  content?: CmsExtraServices;
  /** Shared image/video selected in the page editor for this hero. */
  hero?: CmsHero;
  locale: string;
}) {
  const t = useTranslations("extraServicesPage");
  const tNav = useTranslations("nav");

  const pageText = extraServicesTextFor(content, locale);
  const hasHeroMedia = Boolean(hero?.mediaUrl);

  /**
   * The services to render, and how each one is labelled.
   *
   * An empty CMS list means "use the five built-in services" rather than
   * "show nothing" — the page ships with translated copy for all of them, and
   * an admin who has never opened the editor should still see a full page.
   *
   * Every field falls back individually. A row that kept its `key` but was
   * given no title still reads as "Graphic design" in both languages, because
   * that string exists as a translation and the CMS holds one language at a
   * time. A row the admin added has no key and so must supply its own title.
   */
  const services = content?.services?.length
    ? content.services
        .map((service, index) => {
          const text = extraServiceTextFor(service, locale);
          const builtIn = extraServiceKeys.find((key) => key === service.key);

          return {
            id: service.key || `service-${index}`,
            title: text.title || (builtIn ? tNav(builtIn) : ""),
            description:
              text.description || (builtIn ? t(`items.${builtIn}`) : ""),
            images: service.images?.filter(Boolean) ?? []
          };
        })
        /**
         * A row with no title in this language is dropped.
         *
         * Only reachable for an admin-added service, which has no built-in
         * translation to fall back on: titled in Arabic alone, it would render
         * for an English reader as a blank nav chip above a headless section.
         * A built-in row always resolves a title, so this never hides one.
         */
        .filter((service) => service.title)
    : extraServiceKeys.map((key) => ({
        id: key,
        title: tNav(key),
        description: t(`items.${key}`),
        // No stock showcase. Until images are uploaded in the CMS the service
        // is described in words rather than illustrated with someone else's
        // photographs.
        images: [] as string[]
      }));

  return (
    <>
      <section className="relative flex min-h-130 items-end overflow-hidden border-b border-line bg-card pt-32 sm:h-[68vh] sm:min-h-140 md:pt-36">
        {hasHeroMedia ? (
          <>
            <HeroMedia
              mediaType={hero?.mediaType ?? "image"}
              mediaUrl={hero?.mediaUrl as string}
              posterUrl={hero?.posterUrl}
              fallbackImage="/images/placeHolder.png"
              alt={pageText.title || t("title")}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-base via-base/65 to-base/20" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(200,168,125,0.2),transparent_35%),linear-gradient(140deg,#090909_15%,#17120c_52%,#090909_100%)]" />
            <div className="absolute -end-24 top-10 h-96 w-96 rounded-full border border-accent/20" />
            <div className="absolute -end-10 top-24 h-64 w-64 rounded-full border border-accent/10" />
          </>
        )}
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
              <ServicesIcon className="h-7 w-7" />
              <span className="tracking-nav text-sm font-medium uppercase">
                {pageText.kicker || t("kicker")}
              </span>
            </div>
          </FadeUp>
          <FadeUp delay={0.2}>
            <h1 className="tracking-hero max-w-3xl font-display text-4xl font-semibold leading-tight text-primary md:text-6xl lg:text-7xl">
              {pageText.title || t("title")}
            </h1>
          </FadeUp>
          <FadeUp delay={0.3}>
            <p className="mt-5 max-w-xl leading-relaxed text-secondary md:text-lg">
              {pageText.subtitle || t("subtitle")}
            </p>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="mt-8">
              <Button href={BOOKING_WHATSAPP_URL} className="px-7 py-3 text-sm">
                {pageText.cta || t("cta")}
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>

      <nav
        aria-label={t("serviceBar")}
        className="sticky top-24 z-30 border-b border-line bg-base/95 px-4 py-3 backdrop-blur-xl md:px-10"
      >
        <div className="no-scrollbar mx-auto flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded border border-line bg-black/60 shadow-2xl shadow-black/20 backdrop-blur-md sm:grid sm:max-w-6xl sm:grid-cols-5">
          {services.map((service) => (
            <a
              key={service.id}
              href={`#${service.id}`}
              className="group flex min-h-24 w-34 shrink-0 flex-col items-center justify-center gap-3 border-e border-line px-2 py-4 text-center transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none sm:w-auto"
            >
              <ServicesIcon className="h-8 w-8 shrink-0 text-accent transition-transform duration-500 group-hover:scale-110 group-active:scale-110 group-focus-visible:scale-110" />
              <span className="tracking-nav text-[11px] font-medium uppercase leading-snug text-secondary transition-colors group-hover:text-primary group-active:text-primary group-focus-visible:text-primary">
                {service.title}
              </span>
            </a>
          ))}
        </div>
      </nav>

      <section className="bg-base px-6 py-16 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          {services.map((service, serviceIndex) => (
            <section key={service.id} id={service.id} className="scroll-mt-24 pt-28">
              {/* The sticky service bar lands in this spacer, leaving the
                  service heading clear instead of covering it on anchor jumps. */}
              <FadeUp>
                <div className="mb-7 flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="tracking-nav text-xs font-medium uppercase text-accent">
                      {pageText.workLabel || t("workLabel")}
                    </p>
                    <h2 className="mt-3 font-display text-3xl font-semibold text-primary md:text-4xl">
                      {service.title}
                    </h2>
                  </div>
                  <p className="max-w-md text-sm leading-relaxed text-secondary">
                    {service.description}
                  </p>
                </div>
              </FadeUp>
              {/* Omitted entirely when the service has no images, so the
                  heading and description close up rather than sitting above
                  an empty grid. */}
              <div
                className={
                  service.images.length ? "grid gap-4 md:grid-cols-12 md:gap-5" : "hidden"
                }
              >
                {service.images.map((image, imageIndex) => {
                  const wide = imageIndex !== 1;
                  return (
                    <FadeUp
                      key={image}
                      delay={0.06 * imageIndex}
                      className={wide ? "md:col-span-7" : "md:col-span-5"}
                    >
                      <div
                        className={`group relative overflow-hidden rounded-md border border-white/10 bg-card shadow-2xl shadow-black/20 ${
                          wide ? "aspect-16/10" : "aspect-4/5"
                        }`}
                      >
                        <ResilientImage
                          src={image}
                          alt={`${service.title} ${serviceIndex * 3 + imageIndex + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 60vw"
                          className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                          // A CMS upload is a signed backend URL: already
                          // sized, and it expires. Optimizing it adds a proxy
                          // hop and a cache that outlives the signature.
                          unoptimized={!image.startsWith("/")}
                        />
                      </div>
                    </FadeUp>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
