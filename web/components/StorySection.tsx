"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { storyImages } from "@/lib/data";
import type { HomepageCmsContent } from "@/lib/cms";

gsap.registerPlugin(ScrollTrigger);

const chapterKeys = ["one", "two", "three"] as const;

export default function StorySection({
  content
}: {
  content?: HomepageCmsContent["story"];
}) {
  const t = useTranslations("story");
  // GSAP's pin rewrites the pinned element's parent (wraps it in a
  // pin-spacer it inserts itself), so we pin an inner div rather than
  // the <section> React owns directly — otherwise, on route change,
  // React tries to remove <section> from a parent GSAP already
  // replaced, throwing "removeChild: node is not a child of this node".
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ctx = gsap.context(() => {
      const images = gsap.utils.toArray<HTMLElement>(".story-image");
      const texts = gsap.utils.toArray<HTMLElement>(".story-text");

      if (prefersReducedMotion) {
        gsap.set([images[0], texts[0]], { autoAlpha: 1 });
        return;
      }

      gsap.set(images.slice(1), { autoAlpha: 0 });
      gsap.set(texts.slice(1), { autoAlpha: 0, y: 40 });
      gsap.set([images[0], texts[0]], { autoAlpha: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          end: "+=250%",
          scrub: 0.8,
          pin: true,
          anticipatePin: 1
        }
      });

      // Slow drift on every image while the section is pinned
      images.forEach((img) => {
        tl.fromTo(
          img.querySelector("img"),
          { scale: 1.1 },
          { scale: 1, duration: 3, ease: "none" },
          0
        );
      });

      chapterKeys.forEach((_, i) => {
        if (i === 0) return;
        const at = i * 1.1;
        tl.to(texts[i - 1], { autoAlpha: 0, y: -40, duration: 0.4 }, at);
        tl.to(images[i - 1], { autoAlpha: 0, duration: 0.6 }, at + 0.15);
        tl.to(images[i], { autoAlpha: 1, duration: 0.6 }, at + 0.15);
        tl.fromTo(
          texts[i],
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.5 },
          at + 0.4
        );
      });
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const images = content?.images?.filter(Boolean).slice(0, 3);
  const renderedImages = images?.length === 3 ? images : storyImages;
  const chapters = chapterKeys.map((key, index) => ({
    number: content?.chapters?.[index]?.number || t(`chapters.${key}.number`),
    title: content?.chapters?.[index]?.title || t(`chapters.${key}.title`),
    text: content?.chapters?.[index]?.text || t(`chapters.${key}.text`)
  }));

  return (
    <section className="relative bg-base">
      <div
        ref={wrapperRef}
        className="relative z-10 h-svh w-full overflow-hidden bg-base"
      >
        {/* Image layers */}
        {renderedImages.map((src) => (
          <div key={src} className="story-image absolute inset-0">
            <Image
              src={src}
              alt={content?.title || t("title")}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-base/30" />
          </div>
        ))}

        {/* Fixed header of the story */}
        <div className="absolute inset-x-0 top-0 z-10 mx-auto max-w-7xl px-6 pt-24 md:px-10 md:pt-28">
          <p className="tracking-nav text-xs font-medium uppercase text-accent">
            {content?.label || t("label")}
          </p>
          <h2 className="tracking-title font-display mt-4 text-4xl font-semibold text-primary md:text-6xl">
            {content?.title || t("title")}
          </h2>
          <p className="mt-3 text-sm text-secondary md:text-base">
            {content?.intro || t("intro")}
          </p>
        </div>

        {/* Chapter texts */}
        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-7xl px-6 pb-16 md:px-10 md:pb-24">
          <div className="relative min-h-44 max-w-xl">
            {chapters.map((chapter, index) => (
              <div key={index} className="story-text absolute inset-x-0 bottom-0">
                <p className="font-display text-sm font-medium text-accent">
                  {chapter.number}
                </p>
                <h3 className="tracking-title font-display mt-2 text-2xl font-semibold text-primary md:text-4xl">
                  {chapter.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-secondary md:text-lg">
                  {chapter.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
