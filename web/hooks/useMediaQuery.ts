"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a media query from JS.
 *
 * Starts `false` so the server render and the first client render agree —
 * matching on the server is impossible, and guessing would trip hydration.
 * The real value lands in the effect, one paint later.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
