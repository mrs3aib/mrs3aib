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
 * The list is rendered several times; when the scroll passes the first copy
 * it is rewound by exactly that width, which is invisible because the copies
 * are identical.
 *
 * Nothing moves, and nothing shows, until the logos have loaded. Starting at
 * once meant logos popped in one by one as the strip moved, and every one that
 * arrived widened the row under the running animation — shifting the loop
 * point, so the strip jumped.
 */

type Logo = { name: string; logo: string };

/** Pixels per second. Matches the 28s-per-loop feel of the CSS it replaces. */
const SPEED = 40;

/**
 * The longest the strip waits for its logos. A slow or broken image should
 * delay the reveal, not cancel it.
 */
const READY_TIMEOUT_MS = 3000;

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
  /** Every logo has loaded (or failed, or the wait ran out). */
  const [ready, setReady] = useState(false);
  /**
   * How many times the list is rendered. Two is enough when one copy is wider
   * than the screen; a short list on a wide screen needs more, or its end
   * showed as a gap before the loop came round.
   */
  const [copies, setCopies] = useState(2);

  /**
   * Wait for the first copy's logos to decode. Cached images may already be
   * complete by the time this runs, which `decode` handles too.
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const images = Array.from(
      viewport.querySelectorAll<HTMLImageElement>("[data-first-copy]")
    );

    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };
    const timeout = window.setTimeout(reveal, READY_TIMEOUT_MS);
    void Promise.allSettled(images.map((img) => img.decode())).then(reveal);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [logos]);

  /** Once the row has its real width, repeat it enough to fill the strip. */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!ready || !viewport) return;

    const measure = () => {
      const copyWidth = viewport.scrollWidth / copies;
      if (copyWidth <= 0) return;
      // One copy to scroll through, plus enough to cover the visible width.
      const needed = Math.max(2, Math.ceil(viewport.clientWidth / copyWidth) + 1);
      if (needed !== copies) setCopies(needed);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ready, copies]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || reduceMotion || !ready) return;

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
        // The scrollable width divided by the copies is one copy of the list.
        const loop = viewport.scrollWidth / copies;
        const next = viewport.scrollLeft + (sign * SPEED * elapsed) / 1000;
        // Rewound by exactly one copy, so the jump lands on identical pixels.
        viewport.scrollLeft =
          loop > 0 && Math.abs(next) >= loop ? next - sign * loop : next;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, ready, copies]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  return (
    <div
      ref={viewportRef}
      // Faded in whole once ready, rather than assembling logo by logo.
      className={`marquee-viewport marquee-scroller overflow-x-auto transition-opacity duration-700 ease-out ${
        ready ? "opacity-100" : "opacity-0"
      }`}
      aria-busy={!ready}
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
        {Array.from({ length: copies }, () => logos).flat().map((client, i) => (
          <Image
            key={`${client.name}-${i}`}
            src={client.logo}
            alt={client.name}
            width={170}
            height={32}
            unoptimized={unoptimized}
            // Eager: the repeated copies scroll into view within seconds, and
            // lazy loading made them pop in mid-loop.
            loading="eager"
            data-first-copy={i < logos.length ? "" : undefined}
            // The repeats are the same logos again, so they are not announced.
            aria-hidden={i >= logos.length}
            draggable={false}
            className="h-9 w-auto shrink-0 cursor-default opacity-100 grayscale-0 transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:h-11 md:opacity-50 md:grayscale"
          />
        ))}
      </div>
    </div>
  );
}
