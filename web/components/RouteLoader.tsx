"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import LogoLoader from "./LogoLoader";

const MIN_VISIBLE_MS = 1000;

export default function RouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Any internal link click starts the loader immediately, before the
    // route transition (and its data fetching) has resolved.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (anchor.dataset.routeLoader === "false") return;
      // Programmatic downloads create temporary anchors, often with `blob:`
      // URLs. They are not app navigation, so showing the route loader here
      // leaves it stuck forever because the pathname never changes.
      if (anchor.hasAttribute("download")) return;
      if (href.startsWith("blob:") || href.startsWith("data:")) return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.pathname === window.location.pathname) return;

      shownAt.current = Date.now();
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      setVisible(true);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    if (!visible || shownAt.current === null) return;

    const elapsed = Date.now() - shownAt.current;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);
    hideTimeout.current = setTimeout(() => {
      setVisible(false);
      shownAt.current = null;
    }, remaining);

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-base transition-opacity duration-300"
      aria-hidden="true"
    >
      <LogoLoader className="h-16 w-24 text-accent md:h-20 md:w-32" />
    </div>
  );
}
