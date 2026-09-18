"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { storyImages } from "@/lib/data";
import type {
  HomepageCmsContent,
  StoryImageFit,
  StoryImagePosition,
  StoryImagePresentation,
  StoryTextSize,
  StoryDescriptionTextStyle
} from "@/lib/cms";

gsap.registerPlugin(ScrollTrigger);

const chapterKeys = ["one", "two", "three"] as const;

/**
 * The section pins the viewport and scrubs through chapters, so each one adds
 * scroll distance. A ceiling keeps an over-enthusiastic edit from turning the
 * story into an endless pinned scroll.
 */
const MAX_CHAPTERS = 6;

const mobileFitClass: Record<StoryImageFit, string> = {
  cover: "object-cover",
  contain: "object-contain"
};

const desktopFitClass: Record<StoryImageFit, string> = {
  cover: "md:object-cover",
  contain: "md:object-contain"
};

const mobilePositionClass: Record<StoryImagePosition, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
  "top left": "object-left-top",
  "top right": "object-right-top",
  "bottom left": "object-left-bottom",
  "bottom right": "object-right-bottom"
};

const desktopPositionClass: Record<StoryImagePosition, string> = {
  center: "md:object-center",
  top: "md:object-top",
  bottom: "md:object-bottom",
  left: "md:object-left",
  right: "md:object-right",
  "top left": "md:object-left-top",
  "top right": "md:object-right-top",
  "bottom left": "md:object-left-bottom",
  "bottom right": "md:object-right-bottom"
};

function storyImageClass(presentation?: StoryImagePresentation) {
  const settings = presentation ?? {};
  return [
    mobileFitClass[settings.mobileFit ?? "cover"],
    mobilePositionClass[settings.mobilePosition ?? "center"],
    desktopFitClass[settings.desktopFit ?? "cover"],
    desktopPositionClass[settings.desktopPosition ?? "center"]
  ].join(" ");
}

const mobileDescriptionClass: Record<StoryTextSize, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base"
};

const desktopDescriptionClass: Record<StoryTextSize, string> = {
  small: "md:text-base",
  medium: "md:text-lg",
  large: "md:text-xl"
};

function storyDescriptionClass(style?: StoryDescriptionTextStyle) {
  return [
    mobileDescriptionClass[style?.mobileSize ?? "medium"],
    desktopDescriptionClass[style?.desktopSize ?? "medium"]
  ].join(" ");
}

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

  /**
   * Chapters drive the section: each one is a panel of copy over its own
   * background image. A chapter with no image of its own falls back to the
   * legacy `images` list by position, then to the built-in visuals, so content
   * saved before images moved onto chapters still renders.
   */
  const cmsChapters = content?.chapters?.filter(
    (chapter) => chapter.number || chapter.title || chapter.text || chapter.image
  );
  const legacyImages = content?.images?.filter(Boolean) ?? [];

  const chapters = (
    cmsChapters?.length
      ? cmsChapters.map((chapter, index) => ({
          number: chapter.number || "",
          title: chapter.title || "",
          text: chapter.text || "",
          image:
            chapter.image ||
            legacyImages[index] ||
            storyImages[index % storyImages.length],
          imagePresentation: chapter.imagePresentation,
          descriptionTextStyle: chapter.descriptionTextStyle
        }))
      : chapterKeys.map((key, index) => ({
          number: t(`chapters.${key}.number`),
          title: t(`chapters.${key}.title`),
          text: t(`chapters.${key}.text`),
          image: legacyImages[index] || storyImages[index % storyImages.length],
          imagePresentation: undefined,
          descriptionTextStyle: undefined
        }))
  ).slice(0, MAX_CHAPTERS);
  const chapterCount = chapters.length;

  /**
   * Whether to render the static stack instead of the pinned scrub.
   *
   * The pinned version shows one chapter at a time and relies on scroll to
   * advance; with motion reduced there is nothing to advance it, and every
   * chapter is absolutely positioned at the same spot, so they overlapped into
   * unreadable text. The stack lays them out in normal flow instead.
   *
   * Starts false so the server and the first client render agree; the effect
   * below flips it after mount.
   */
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // The static stack needs no timeline, and building one would pin the
    // section to a scroll it never scrubs.
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const images = gsap.utils.toArray<HTMLElement>(".story-image");
      const texts = gsap.utils.toArray<HTMLElement>(".story-text");

      gsap.set(images.slice(1), { autoAlpha: 0 });
      gsap.set(texts.slice(1), { autoAlpha: 0, y: 40 });
      gsap.set([images[0], texts[0]], { autoAlpha: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          // Scroll distance grows with the chapter count so each chapter gets
          // roughly the same amount of scrub, whatever the CMS holds.
          end: `+=${Math.max(1, chapterCount - 1) * 125}%`,
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

      texts.forEach((_, i) => {
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
    // Rebuilt when the chapter count changes: the timeline's steps and pin
    // distance are both derived from it.
  }, [chapterCount]);


  const label = content?.label || t("label");
  const title = content?.title || t("title");
  const intro = content?.intro || t("intro");

  /**
   * Motion reduced: lay the chapters out in normal flow.
   *
   * The pinned version stacks every chapter at the same absolute position and
   * reveals them by scroll. Without that scrub they all sit on top of each
   * other inside a clipped, fixed-height box — the copy was there but unreadable
   * and partly cut off. Here each chapter is its own block, so nothing overlaps
   * and nothing is clipped.
   */
  if (reduceMotion) {
    return (
      <section className="relative bg-base px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="tracking-nav text-xs font-medium uppercase text-accent">
            {label}
          </p>
          <h2 className="tracking-title font-display mt-4 text-3xl font-semibold text-primary sm:text-4xl md:text-6xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-secondary">{intro}</p>

          <div className="mt-10 space-y-10">
            {chapters.map((chapter, index) => (
              <article key={index} className="grid gap-5 md:grid-cols-2 md:items-center">
                {/* Taller on phones than the desktop 4:3, matching the
                    portrait crop the pinned version shows and the shape the
                    CMS asks admins to upload. */}
                <div className="relative aspect-3/4 overflow-hidden rounded-md sm:aspect-4/3">
                  <Image
                    src={chapter.image}
                    alt={chapter.title || title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={storyImageClass(chapter.imagePresentation)}
                    // A CMS chapter image is a signed URL that expires; see the
                    // note on the pinned layer below.
                    unoptimized={!chapter.image.startsWith("/")}
                  />
                </div>
                <div>
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
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-base">
      <div
        ref={wrapperRef}
        className="relative z-10 h-svh w-full overflow-hidden bg-base"
      >
        {/* Image layers */}
        {chapters.map((chapter, index) => (
          <div key={index} className="story-image absolute inset-0">
            <Image
              src={chapter.image}
              alt={title}
              fill
              sizes="100vw"
              className={storyImageClass(chapter.imagePresentation)}
              /*
               * A chapter image may come from the CMS, which supplies a signed
               * storage URL that expires. The optimizer would cache a
               * derivative against a URL that stops working and then answer the
               * lapsed source with an error rather than the original. The
               * built-in visuals are local paths and optimize fine.
               */
              unoptimized={!chapter.image.startsWith("/")}
            />
            {/*
              Two scrims rather than one wash over the whole frame.
              
              A single top-to-bottom gradient had to be dark enough to carry
              the chapter copy at the bottom, which meant it also dimmed the
              middle of the photo where the subject usually sits. These darken
              only the two bands that actually hold text — the header above and
              the chapter below — and leave the centre of the image at full
              strength. On phones the bands are taller, because the text
              occupies proportionally more of a narrow screen.
            */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-linear-to-b from-base via-base/70 to-transparent md:h-1/3" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-base via-base/75 to-transparent md:h-1/2" />
          </div>
        ))}

        {/*
          One column, two bands: header at the top, chapters at the bottom.

          Both used to be absolutely positioned against the same fixed-height
          box — header pinned to the top, chapters to the bottom — with nothing
          between them to keep them apart. On a short phone the two simply
          overlapped, and because the box clips, whatever collided was cut off
          rather than pushed. The intro was `line-clamp-2` and the chapter text
          `line-clamp-3` to paper over it, which truncated real content instead
          of fixing the cause.

          As a flex column the middle spacer absorbs whatever height is left
          over, so the bands push apart instead of into each other and the
          clamps are no longer needed. The gap also leaves the centre of the
          photo — where the subject almost always is — clear of text.
        */}
        <div className="absolute inset-0 z-10 flex flex-col px-6 pt-24 pb-16 md:px-10 md:pt-28 md:pb-24">
          <div className="mx-auto w-full max-w-7xl shrink-0">
            <p className="tracking-nav text-xs font-medium uppercase text-accent">
              {label}
            </p>
            <h2 className="tracking-title font-display mt-3 text-3xl font-semibold text-primary sm:text-4xl md:mt-4 md:text-6xl">
              {title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-secondary md:mt-3">
              {intro}
            </p>
          </div>

          {/* Takes the slack, keeping the photo's middle visible. */}
          <div className="min-h-8 grow" />

          {/*
            The chapter band is sized by its tallest chapter, so a long chapter
            is never clipped and a short one leaves no dead space — replacing
            the fixed `min-h-44` that did neither.

            Every chapter is absolutely positioned so they can cross-fade in
            place. That leaves nothing in flow to give the band height, so a
            hidden copy of all of them is stacked in normal flow purely as a
            sizer: it is `invisible` (occupies space, draws nothing) rather
            than `hidden`, and `aria-hidden` keeps the duplicate text out of
            the accessibility tree. Sizing off chapter one alone would collapse
            the band whenever a longer chapter faded in, pushing its last lines
            off the bottom of the clipped box.
          */}
          <div className="mx-auto w-full max-w-7xl shrink-0">
            <div className="relative max-w-xl">
              <div aria-hidden="true" className="invisible grid">
                {chapters.map((chapter, index) => (
                  // Every sizer shares one grid cell, so the band ends up as
                  // tall as the tallest chapter rather than all of them added
                  // together.
                  <div key={index} className="col-start-1 row-start-1">
                    <p className="font-display text-sm font-medium text-accent">
                      {chapter.number}
                    </p>
                    <h3 className="tracking-title font-display mt-2 text-xl font-semibold text-primary sm:text-2xl md:text-4xl">
                      {chapter.title}
                    </h3>
                    <p className={`mt-3 leading-relaxed text-secondary ${storyDescriptionClass(chapter.descriptionTextStyle)} md:mt-4`}>
                      {chapter.text}
                    </p>
                  </div>
                ))}
              </div>

              {chapters.map((chapter, index) => (
                <div key={index} className="story-text absolute inset-x-0 bottom-0">
                  <p className="font-display text-sm font-medium text-accent">
                    {chapter.number}
                  </p>
                  <h3 className="tracking-title font-display mt-2 text-xl font-semibold text-primary sm:text-2xl md:text-4xl">
                    {chapter.title}
                  </h3>
                  <p className={`mt-3 leading-relaxed text-secondary ${storyDescriptionClass(chapter.descriptionTextStyle)} md:mt-4`}>
                    {chapter.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
