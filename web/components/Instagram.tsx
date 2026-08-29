import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { instagramImages } from "@/lib/data";
import type { HomepageCmsContent } from "@/lib/cms";
import { FadeUp } from "./Reveal";
import { ArrowUpRight } from "./icons";

export default async function Instagram({
  content
}: {
  content?: HomepageCmsContent["instagram"];
}) {
  const t = await getTranslations("instagram");
  const images = content?.images?.filter(Boolean).length
    ? content.images.filter(Boolean)
    : instagramImages;
  const url = content?.url || "https://instagram.com";

  return (
    <section className="mx-auto max-w-7xl px-6 py-28 md:px-10 md:py-40">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <FadeUp>
            <p className="tracking-nav mb-5 text-xs font-medium uppercase text-accent">
              {content?.label || t("label")}
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="tracking-title font-display text-4xl font-semibold text-primary md:text-6xl">
              {content?.title || t("title")}
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mt-4 text-secondary">
              {content?.subtitle || t("subtitle")}
            </p>
          </FadeUp>
        </div>
        <FadeUp delay={0.2}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-3 text-sm font-medium text-primary transition-colors duration-300 hover:text-accent active:text-accent focus-visible:text-accent focus-visible:outline-none"
          >
            <span className="border-b border-white/20 pb-1 transition-colors duration-300 group-hover:border-accent group-active:border-accent group-focus-visible:border-accent">
              {content?.follow || t("follow")}
            </span>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-active:-translate-y-0.5 group-active:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:group-active:-translate-x-0.5 rtl:group-focus-visible:-translate-x-0.5" />
          </a>
        </FadeUp>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {images.map((src, i) => (
          <FadeUp key={src} delay={(i % 4) * 0.06}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-sm focus-visible:outline-none"
            >
              <Image
                src={src}
                alt={content?.title || t("title")}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105 group-active:scale-105 group-focus-visible:scale-105"
              />
              <div className="touch-reveal absolute inset-0 flex items-center justify-center bg-base/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-active:opacity-100 group-focus-visible:opacity-100">
                <ArrowUpRight className="h-6 w-6 text-primary" />
              </div>
            </a>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}
