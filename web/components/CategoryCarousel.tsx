"use client";

import { useEffect, useMemo, useRef } from "react";
import CategoryLink from "./CategoryLink";

type CategoryCarouselProps = {
  categories: readonly string[];
  labels: Record<string, string>;
  className?: string;
  itemClassName?: string;
};

export default function CategoryCarousel({
  categories,
  labels,
  className,
  itemClassName
}: CategoryCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loopedCategories = useMemo(
    () => [...categories, ...categories, ...categories],
    [categories]
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // In RTL, scrollLeft counts down from 0 into negatives, so normalise to a
    // always-positive offset before doing any loop math.
    const isRtl = getComputedStyle(scroller).direction === "rtl";
    const readOffset = () => Math.abs(scroller.scrollLeft);
    const writeOffset = (value: number) => {
      scroller.scrollLeft = isRtl ? -value : value;
    };

    let segment = 0;
    let adjusting = false;

    const recenter = () => {
      segment = scroller.scrollWidth / 3;
      if (!segment) return;
      adjusting = true;
      writeOffset(segment);
      adjusting = false;
    };

    const keepInLoop = () => {
      if (adjusting || !segment) return;
      const offset = readOffset();
      if (offset < segment * 0.5) {
        adjusting = true;
        writeOffset(offset + segment);
        adjusting = false;
      } else if (offset > segment * 1.5) {
        adjusting = true;
        writeOffset(offset - segment);
        adjusting = false;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (!delta) return;

      // Claim the gesture so the page (and Lenis) does not scroll vertically.
      event.preventDefault();
      writeOffset(readOffset() + delta);
      keepInLoop();
    };

    const frame = window.requestAnimationFrame(recenter);

    // Only re-centre when the track itself changes size (font load, rotation),
    // never on every scroll-induced layout read.
    let lastWidth = scroller.scrollWidth;
    const resizeObserver = new ResizeObserver(() => {
      if (scroller.scrollWidth === lastWidth) return;
      lastWidth = scroller.scrollWidth;
      recenter();
    });
    resizeObserver.observe(scroller);

    scroller.addEventListener("scroll", keepInLoop, { passive: true });
    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", keepInLoop);
      scroller.removeEventListener("wheel", handleWheel);
    };
  }, [loopedCategories.length]);

  return (
    <div
      ref={scrollerRef}
      data-lenis-prevent
      className={`no-scrollbar flex overflow-x-auto overscroll-x-contain [touch-action:pan-x] ${className ?? ""}`}
      aria-label="Categories"
    >
      {loopedCategories.map((id, index) => (
        <CategoryLink
          key={`${id}-${index}`}
          id={id}
          label={labels[id]}
          className={`w-34 shrink-0 ${itemClassName ?? ""}`}
        />
      ))}
    </div>
  );
}
