"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "@/lib/scroll";
import { usePathname } from "@/i18n/navigation";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  // `<main>` swaps its whole subtree on route change while this layout
  // (and therefore Lenis/ScrollTrigger) stays mounted. Any ScrollTrigger
  // pinned to a node from the previous route would otherwise keep
  // reading/writing DOM that React just deleted, racing its own cleanup.
  // Skip the initial mount: children register their own ScrollTriggers
  // (e.g. StorySection's pin) after this runs, and killing them here
  // would just erase what was never a "previous route" to begin with.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    ScrollTrigger.refresh();
  }, [pathname]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true
    });
    setLenis(lenis);

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      setLenis(null);
      // Drop any ScrollTrigger instances tied to nodes this Lenis
      // instance is going away with, so a remount (Strict Mode,
      // Suspense) never reconciles against stale proxy elements.
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return <>{children}</>;
}
