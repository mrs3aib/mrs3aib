"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The partner logo strip: scrolls itself, but yields to the visitor.
 *
 * A CSS `translateX` animation cannot do that — the transform fights any
 * attempt to scroll the same element, and `:hover` does not exist on touch, so
 * on a phone the strip could neither be paused nor moved by hand. Driving a
 * real `scrollLeft` instead means the browser's own touch scrolling works,
 * and pausing is simply "stop advancing it".
 *
 * The list is rendered twice; when the scroll passes the first copy it is
 * rewound by exactly that width, which is invisible because the two copies are
 * identical.
 */

type Logo = { name: string; logo: string };

/** Pixels per second. Matches the 28s-per-loop feel of the CSS it replaces. */
const SPEED = 40;

export function ClientsMarquee({
  logos,
  unoptimized,
  label
}: {
  logos: Logo[];
  /** CMS logos bypass the optimizer — see the note in `Clients`. */
  unoptimized: boolean;
  /** Names the scrollable region; translated by the server component. */
  label: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  /**
   * Held in a ref, not state: the animation frame reads it every tick, and a
   * re-render per press would restart the loop.
   */
  const pausedRef = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || reduceMotion) return;

    /**
     * In a right-to-left document `scrollLeft` starts at 0 and runs negative,
     * so advancing means subtracting. Read from the element rather than the
     * locale: this is about how the browser reports scroll, not the language.
     */
    const rtl = getComputedStyle(viewport).direction === "rtl";
    const sign = rtl ? -1 : 1;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;

      if (!pausedRef.current) {
        // Half the scrollable width is one full copy of the list.
        const loop = viewport.scrollWidth / 2;
        const next = viewport.scrollLeft + (sign * SPEED * elapsed) / 1000;
        // Rewound by exactly one copy, so the jump lands on identical pixels.
        viewport.scrollLeft =
          loop > 0 && Math.abs(next) >= loop ? next - sign * loop : next;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  return (
    <div
      ref={viewportRef}
      className="marquee-viewport marquee-scroller overflow-x-auto"
      // Pausing is a convenience for a pointer that is already here, not a
      // control: the strip is decorative and every logo comes back around.
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onMouseEnter={pause}
      onMouseLeave={resume}
      // A touch drag scrolls natively; pausing for its duration stops the
      // animation from fighting the finger.
      onTouchStart={pause}
      onTouchEnd={resume}
      // Keyboard and assistive tech reach the same pause.
      onFocus={pause}
      onBlur={resume}
      // Scrollable regions must be reachable by keyboard, which needs a role
      // and a name to go with the tab stop.
      tabIndex={0}
      role="group"
      aria-label={label}
    >
      <div className="flex w-max items-center gap-16 md:gap-24">
        {[...logos, ...logos].map((client, i) => (
          <Image
            key={`${client.name}-${i}`}
            src={client.logo}
            alt={client.name}
            width={170}
            height={32}
            unoptimized={unoptimized}
            // The second copy is the same logos again, so it is not announced.
            aria-hidden={i >= logos.length}
            draggable={false}
            className="h-9 w-auto shrink-0 cursor-default opacity-100 grayscale-0 transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:h-11 md:opacity-50 md:grayscale"
          />
        ))}
      </div>
    </div>
  );
}
