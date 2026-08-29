"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  BOOKING_WHATSAPP_URL,
  categories,
  extraServiceKeys
} from "@/lib/data";
import { scrollToId } from "@/lib/scroll";
import {
  CameraIcon,
  ChevronDownIcon,
  GridIcon,
  WeddingIcon,
  categoryIcons
} from "./icons";

/** Connected profiles, used for the studio's social-media accounts. */
function SocialAccountsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      className={className}
    >
      <circle cx="7" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="6.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="17.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m9.1 10.8 5.8-3.1m-5.8 5.5 5.8 3.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Four-point sparkle, for the studio's non-photography services. */
function ServicesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      className={className}
    >
      <path
        d="M12 3.5c.6 3.9 1.7 5 5.6 5.6-3.9.6-5 1.7-5.6 5.6-.6-3.9-1.7-5-5.6-5.6 3.9-.6 5-1.7 5.6-5.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 14.4c.3 1.9.8 2.4 2.7 2.7-1.9.3-2.4.8-2.7 2.7-.3-1.9-.8-2.4-2.7-2.7 1.9-.3 2.4-.8 2.7-2.7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.06 22l5.25-1.38a9.87 9.87 0 0 0 4.73 1.2h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z"
      />
    </svg>
  );
}

/**
 * Phone-only bottom tab bar.
 *
 * Hidden from `md` up, where the header nav already covers this ground. It
 * also retracts once the reader reaches the site footer: the footer carries
 * the same links and contact details, so leaving the bar pinned there would
 * cover that content with a duplicate of itself.
 */
export default function MobileTabBar() {
  const t = useTranslations("mobileBar");
  const tCategories = useTranslations("categories");
  // The service labels are the same strings the header dropdown uses.
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  // A single value rather than one flag per sheet: the two sheets share the
  // same slot above the bar, so opening one must close the other.
  const [openSheet, setOpenSheet] = useState<"categories" | "services" | null>(
    null
  );
  const [atFooter, setAtFooter] = useState(false);
  // Set when a service tap had to navigate home first; consumed once the
  // contact section exists. See `goToContact`.
  const [pendingContact, setPendingContact] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const categoriesToggleRef = useRef<HTMLButtonElement>(null);
  const servicesToggleRef = useRef<HTMLButtonElement>(null);

  const isWeddings = pathname === "/category/weddings";

  /**
   * Retract the bar while the footer is on screen.
   *
   * An IntersectionObserver on the footer costs nothing per frame, unlike a
   * scroll handler measuring offsets. The footer renders from the root layout
   * on every route, so it is re-queried whenever the path changes.
   */
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setAtFooter(entry.isIntersecting),
      // A sliver of footer is not enough to hide the bar — wait until a strip
      // taller than the bar itself is showing, so it does not flicker away at
      // the moment the footer's top edge appears.
      { rootMargin: "0px 0px -72px 0px" }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);

  // Close any open sheet on navigation — the destination is behind it.
  useEffect(() => {
    setOpenSheet(null);
  }, [pathname]);

  // Dismiss the sheet on an outside tap or Escape, matching the other overlays.
  useEffect(() => {
    if (!openSheet) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // Both toggles count as "inside": closing here would race their own
      // onClick, which fires afterwards and would toggle the sheet straight
      // back open — leaving it stuck.
      if (
        !sheetRef.current?.contains(target) &&
        !categoriesToggleRef.current?.contains(target) &&
        !servicesToggleRef.current?.contains(target)
      ) {
        setOpenSheet(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenSheet(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSheet]);

  /**
   * Send an enquiry to the contact section.
   *
   * `#contact` is rendered by the home page alone, but this bar is on every
   * route — so from a category or album page there is nothing to scroll to and
   * the tap has to navigate first. A plain `/#contact` push would not be
   * enough: Lenis drives scrolling here and the browser's native hash jump
   * does not reach it, so the scroll is deferred and run by the effect below
   * once the section has actually mounted.
   */
  const goToContact = () => {
    setOpenSheet(null);
    if (document.querySelector("#contact")) {
      scrollToId("#contact");
      return;
    }
    setPendingContact(true);
    router.push("/");
  };

  // Run a deferred contact scroll once the home page has painted the section.
  useEffect(() => {
    if (!pendingContact) return;

    let frame = 0;
    // The route change resolves before the new page's markup is committed, so
    // poll a few frames rather than assuming the section is there on the first.
    const attempt = (remaining: number) => {
      if (document.querySelector("#contact")) {
        scrollToId("#contact");
        setPendingContact(false);
        return;
      }
      if (remaining === 0) {
        // Give up quietly rather than leaving the flag armed to fire on some
        // unrelated later navigation.
        setPendingContact(false);
        return;
      }
      frame = requestAnimationFrame(() => attempt(remaining - 1));
    };

    attempt(60);
    return () => cancelAnimationFrame(frame);
  }, [pendingContact, pathname]);

  const itemClass =
    "flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-colors duration-300";
  const labelClass = "text-[11px] font-medium leading-none";

  return (
    <motion.div
      // `translate` rather than unmounting: the bar slides out of view and the
      // footer links take over, then it slides back on the way up.
      animate={{ y: atFooter ? 120 : 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={atFooter}
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
    >
      <AnimatePresence>
        {openSheet ? (
          <motion.div
            // Keyed so switching between the two sheets animates as a swap
            // rather than silently rerendering the open panel's contents.
            key={openSheet}
            ref={sheetRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-3 mb-2 rounded-lg border border-white/10 bg-base/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            {openSheet === "categories" ? (
              <div className="grid grid-cols-4 gap-1">
                {categories.map((id) => {
                  const Icon = categoryIcons[id] ?? CameraIcon;
                  return (
                    <Link
                      key={id}
                      href={`/category/${id}`}
                      className="flex flex-col items-center gap-2 rounded px-1 py-2.5 text-center transition-colors hover:bg-white/5 active:bg-white/10"
                    >
                      <Icon className="h-6 w-6 shrink-0 text-accent" />
                      <span className="text-[10px] leading-tight text-secondary">
                        {tCategories(id)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              // Services are words, not destinations with imagery, so they read
              // as a plain list rather than the categories' icon grid.
              <div className="flex flex-col">
                {extraServiceKeys.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={goToContact}
                    className="rounded px-3 py-2.5 text-start text-sm text-secondary transition-colors hover:bg-white/5 hover:text-accent active:bg-white/10"
                  >
                    {tNav(service)}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* `pb-[env(safe-area-inset-bottom)]` keeps the row clear of the iOS home
          indicator, which would otherwise sit on top of the labels. */}
      <nav className="flex items-stretch border-t border-line bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <button
          ref={categoriesToggleRef}
          type="button"
          aria-expanded={openSheet === "categories"}
          onClick={() =>
            setOpenSheet((open) =>
              open === "categories" ? null : "categories"
            )
          }
          className={`${itemClass} ${
            openSheet === "categories" ? "text-accent" : "text-secondary"
          }`}
        >
          <GridIcon className="h-6 w-6" />
          <span className={`${labelClass} flex items-center gap-1`}>
            {t("categories")}
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform duration-300 ${
                openSheet === "categories" ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        <Link
          href="/category/weddings"
          className={`${itemClass} ${
            isWeddings ? "text-accent" : "text-secondary"
          }`}
        >
          <WeddingIcon className="h-6 w-6" />
          <span className={labelClass}>{t("weddings")}</span>
        </Link>

        <button
          ref={servicesToggleRef}
          type="button"
          aria-expanded={openSheet === "services"}
          onClick={() =>
            setOpenSheet((open) => (open === "services" ? null : "services"))
          }
          className={`${itemClass} ${
            openSheet === "services" ? "text-accent" : "text-secondary"
          }`}
        >
          <ServicesIcon className="h-6 w-6" />
          <span className={`${labelClass} flex items-center gap-1`}>
            {t("extraServices")}
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform duration-300 ${
                openSheet === "services" ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        <a
          href="#social-accounts"
          onClick={(e) => {
            const target = document.querySelector("#social-accounts");
            if (!target) return;
            e.preventDefault();
            scrollToId("#social-accounts");
          }}
          className={`${itemClass} text-secondary`}
        >
          <SocialAccountsIcon className="h-6 w-6" />
          <span className={labelClass}>{t("accounts")}</span>
        </a>

        <a
          href={BOOKING_WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className={`${itemClass} text-secondary`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black shadow-lg shadow-accent/25">
            <WhatsappIcon className="h-6 w-6" />
          </span>
          <span className={labelClass}>{t("bookNow")}</span>
        </a>
      </nav>
    </motion.div>
  );
}
