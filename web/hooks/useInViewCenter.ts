"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is sitting in the vertical middle of the viewport.
 *
 * This stands in for `:hover` on touch devices, where a card can never be
 * hovered: the card the reader has scrolled to the centre of the screen is
 * treated as the one they are "pointing at", and reveals itself.
 *
 * The trigger is the viewport's exact centre line, carved out with a symmetric
 * `-50%` `rootMargin` that collapses the observer's root to a zero-height strip.
 * A card intersects it only while that line falls inside the card, so exactly
 * one card is ever revealed — a taller band would light up every card
 * overlapping it, which on a single-column phone layout is most of them.
 *
 * Using the observer rather than a scroll handler keeps the work on the
 * browser's own compositor, with nothing measuring offsets every frame.
 *
 * `enabled` is threaded through rather than checked by the caller so the
 * observer is never even created on pointer devices, where hover already wins.
 */
export function useInViewCenter<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!enabled || !element) {
      // Clear any state left over from the last time this was on, otherwise a
      // card frozen mid-reveal would stay that way after a resize to desktop.
      setIsCentered(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsCentered(entry.isIntersecting),
      // A zero-height root at the centre line. `-50%` on both edges is exact
      // rather than approximate, and the default threshold of 0 is what makes
      // it fire: any overlap at all — which for a zero-height root means the
      // line is inside the card — counts as centred.
      { rootMargin: "-50% 0px -50% 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return { ref, isCentered };
}
