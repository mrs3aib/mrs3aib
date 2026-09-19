"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { BOOKING_WHATSAPP_URL, extraServiceKeys, navLinks } from "@/lib/data";
import { scrollToId, startScroll, stopScroll } from "@/lib/scroll";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import AuthModal from "./AuthModal";
import { CloseIcon } from "./icons";

/** Below this scroll depth the bar always stays visible. */
const HIDE_AFTER_PX = 120;

/** How close to the top edge the cursor must come to call the bar back. */
const REVEAL_ZONE_PX = 80;

/**
 * How far down the cursor may drift before the bar tucks away again.
 *
 * Taller than the bar itself (h-24, 96px) so moving onto the revealed bar
 * cannot dismiss the thing being reached for.
 */
const KEEP_OPEN_ZONE_PX = 140;

type AuthUser = {
  name: string;
  phone: string;
};

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3">
      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Dropdown({ children }: { children: ReactNode }) {
  return (
    <div className="invisible absolute start-0 top-full z-50 mt-3 w-56 translate-y-1 rounded border border-white/10 bg-card/95 p-2 opacity-0 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
      {children}
    </div>
  );
}

function MobileDropdown({
  label,
  open,
  onToggle,
  children
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025]">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-start text-sm font-medium text-primary transition-colors hover:bg-white/[0.04] hover:text-accent"
      >
        {label}
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown />
        </span>
      </button>
      {open ? <div className="border-t border-white/10 px-4 py-2">{children}</div> : null}
    </div>
  );
}

export default function Navbar({
  categoryItems
}: {
  /**
   * Categories the CMS still shows, resolved in the layout. Previously the
   * hardcoded list was used here, so a category hidden in the CMS kept its menu
   * entry and sent visitors to a 404.
   */
  categoryItems: { id: string; label: string }[];
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isCategoryPage =
    pathname.startsWith("/category/") || pathname === "/extra-services";
  const [scrolled, setScrolled] = useState(false);
  /** True once the page has scrolled past where the bar sits. */
  const [pastBar, setPastBar] = useState(false);
  /** True while the cursor is at the top of the window, summoning the bar. */
  const [pointerInTop, setPointerInTop] = useState(false);
  /** True while keyboard focus is somewhere inside the bar. */
  const [focusInside, setFocusInside] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobilePhotographyOpen, setMobilePhotographyOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  /**
   * Client accounts are not offered for now, so the sign-in entry points stay
   * hidden. The signed-in UI below is deliberately left in place: anyone with
   * an existing session can still see who they are and sign out, rather than
   * being stranded with no way back out.
   */
  const showSignIn = false;

  useEffect(() => {
    const savedUser = window.localStorage.getItem("studio-auth-user");
    if (!savedUser) return;
    try {
      setAuthUser(JSON.parse(savedUser) as AuthUser);
    } catch {
      window.localStorage.removeItem("studio-auth-user");
    }
  }, []);

  /**
   * Past the fold the bar stays tucked away, whichever direction the page is
   * moving. Scrolling back up deliberately does *not* bring it out — only the
   * cursor reaching the top edge does, or the page returning to where the bar
   * actually lives.
   */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setPastBar(y > HIDE_AFTER_PX);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * Bring the bar back when the cursor reaches the top of the window.
   *
   * This is the only way to summon it while scrolled down, so the reveal has
   * to survive the pointer then moving onto the bar itself: revealing sets
   * `pointerInTop`, and it is only cleared once the cursor leaves a zone tall
   * enough to contain the bar — otherwise the bar would slide out, take the
   * cursor out of the 80px trigger band, and immediately hide again.
   *
   * `clientY` is viewport-relative, so this is the top edge of the window
   * rather than of the document.
   *
   * Pointer events cover mouse, pen and touch. A touch has no hover, so on
   * phones the bar is reached by scrolling back to the top of the page — which
   * is the gesture people already use there.
   */
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (event.clientY <= REVEAL_ZONE_PX) {
        setPointerInTop(true);
        return;
      }
      // Wider band on the way out than on the way in. With one boundary the
      // revealed bar sits under the cursor, and the smallest movement below
      // the line hides it again — a flicker at exactly the moment the visitor
      // is reaching for it.
      if (event.clientY > KEEP_OPEN_ZONE_PX) setPointerInTop(false);
    };

    // A cursor leaving through the top of the window stops producing moves, so
    // without this the bar would stay out after the pointer has gone.
    const onPointerLeave = () => setPointerInTop(false);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  /**
   * Whether the bar is tucked away above the viewport.
   *
   * Derived rather than stored, so the inputs can never disagree — an earlier
   * version kept `hidden` in state and every new reveal path had to remember
   * to clear it.
   *
   * It shows when the page is still at the top, when the cursor is summoning
   * it, when focus is inside it, or while something opened from it is on
   * screen — a menu or modal dismissed back to a bar that was not there would
   * leave the visitor with nowhere to return to.
   */
  const hidden =
    pastBar && !pointerInTop && !focusInside && !menuOpen && !authOpen && !userMenuOpen;

  useEffect(() => {
    if (menuOpen || authOpen) stopScroll();
    else startScroll();
    return () => startScroll();
  }, [menuOpen, authOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const go = (href: string) => {
    setMenuOpen(false);
    // Let the menu close before the page starts moving.
    setTimeout(() => {
      if (href === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scrollToId(href);
    }, 150);
  };

  const handleAuthComplete = (user: AuthUser) => {
    setAuthUser(user);
    window.localStorage.setItem("studio-auth-user", JSON.stringify(user));
  };

  const handleSignOut = () => {
    setAuthUser(null);
    setUserMenuOpen(false);
    setMenuOpen(false);
    window.localStorage.removeItem("studio-auth-user");
  };

  const initials =
    authUser?.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "Y";

  return (
    <>
      {/*
        The entrance animation runs once on mount; after that `y` is driven by
        `hidden` so the two never fight over the same property. Framer keeps
        animating the same value, which is why this slides rather than jumps.
      */}
      <motion.header
        initial={{ y: -32, opacity: 0 }}
        animate={{ y: hidden ? "-100%" : 0, opacity: 1 }}
        transition={{ duration: hidden ? 0.35 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        // Tabbing into the bar while it is tucked away would move focus to
        // something the visitor cannot see; revealing on focus keeps the
        // keyboard path in step with the pointer one, and releasing on blur
        // lets it tuck away once focus moves on into the page.
        onFocusCapture={() => setFocusInside(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocusInside(false);
          }
        }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled
            ? "border-b border-line bg-base/70 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link
            href="/"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center"
          >
            <Image
              src="/logo2.svg"
              alt="Yahya Al-Saib"
              width={28}
              height={38}
              className="h-10 w-auto"
            />
          </Link>

          {!isCategoryPage ? (
            <ul className="hidden items-center gap-7 lg:flex rtl:flex-row-reverse">
              {navLinks.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToId(link.href);
                    }}
                    className="tracking-nav text-xs font-medium uppercase text-secondary transition-colors duration-300 hover:text-primary"
                  >
                    {t(link.key)}
                  </a>
                </li>
              ))}
              <li className="group relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 tracking-nav text-xs font-medium uppercase text-secondary transition-colors duration-300 hover:text-primary group-focus-within:text-primary"
                >
                  {t("photographyVideoMenu")}
                  <ChevronDown />
                </button>
                <Dropdown>
                  {categoryItems.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.id}`}
                      className="block rounded px-3 py-2 text-sm text-secondary transition-colors hover:bg-white/5 hover:text-primary"
                    >
                      {category.label}
                    </Link>
                  ))}
                </Dropdown>
              </li>
              <li className="group relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 tracking-nav text-xs font-medium uppercase text-secondary transition-colors duration-300 hover:text-primary group-focus-within:text-primary"
                >
                  {t("extraServices")}
                  <ChevronDown />
                </button>
                <Dropdown>
                  {extraServiceKeys.map((service) => (
                    <Link
                      key={service}
                      href={`/extra-services#${service}`}
                      className="block rounded px-3 py-2 text-sm text-secondary transition-colors hover:bg-white/5 hover:text-primary"
                    >
                      {t(service)}
                    </Link>
                  ))}
                </Dropdown>
              </li>
            </ul>
          ) : null}

          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            {authUser ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label={authUser.name}
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded border border-accent/40 bg-accent text-xs font-semibold uppercase text-black shadow-lg shadow-accent/15"
                >
                  {initials}
                </button>
                <AnimatePresence>
                  {userMenuOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute end-0 top-13 w-48 rounded border border-white/10 bg-card/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
                    >
                      <p className="truncate px-3 py-2 text-sm text-primary">
                        {authUser.name}
                      </p>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full rounded px-3 py-2 text-start text-sm text-secondary transition-colors hover:bg-white/5 hover:text-primary"
                      >
                        {t("signOut")}
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : showSignIn ? (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="hidden rounded border border-white/20 px-5 py-2.5 text-xs font-medium text-primary transition-all duration-500 hover:border-accent hover:bg-accent hover:text-black md:inline-flex"
              >
                {t("auth")}
              </button>
            ) : null}
            {!isCategoryPage ? (
              <>
                <a
                  href={BOOKING_WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden rounded border border-white/20 px-6 py-2.5 text-xs font-medium text-primary transition-all duration-500 hover:border-white hover:bg-white hover:text-black md:inline-flex"
                >
                  {t("book")}
                </a>
                <button
                  type="button"
                  aria-label={t("menu")}
                  onClick={() => setMenuOpen(true)}
                  className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
                >
                  <span className="h-px w-6 bg-white" />
                  <span className="h-px w-6 bg-white" />
                </button>
              </>
            ) : null}
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          >
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={t("menu")}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative ms-auto flex h-full w-full max-w-md flex-col border-s border-white/10 bg-[#0b0b0c]/[0.98] shadow-2xl shadow-black/60"
            >
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
              <Image
                src="/logo2.svg"
                alt="Yahya Al-Saib"
                width={28}
                height={38}
                className="h-10 w-auto"
              />
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-secondary transition-colors hover:text-primary"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-6">
              <p className="tracking-nav text-[10px] font-medium uppercase text-accent">
                {t("menu")}
              </p>
              <div className="flex flex-col gap-1 border-b border-white/10 pb-5">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.key}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.1 + i * 0.07,
                    duration: 0.7,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  onClick={() => go(link.href)}
                  className="w-full rounded-lg px-3 py-2 text-start tracking-title font-display text-2xl font-semibold text-primary transition-colors duration-200 hover:bg-white/[0.05] hover:text-accent"
                >
                  {t(link.key)}
                </motion.button>
              ))}
              </div>
              <div className="flex flex-col gap-2 border-b border-white/10 pb-5">
              <MobileDropdown
                label={t("photographyVideoMenu")}
                open={mobilePhotographyOpen}
                onToggle={() => setMobilePhotographyOpen((open) => !open)}
              >
                {categoryItems.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm text-secondary transition-colors hover:bg-white/[0.05] hover:text-accent"
                  >
                    {category.label}
                  </Link>
                ))}
              </MobileDropdown>
              <MobileDropdown
                label={t("extraServices")}
                open={mobileServicesOpen}
                onToggle={() => setMobileServicesOpen((open) => !open)}
              >
                {extraServiceKeys.map((service) => (
                  <Link
                    key={service}
                    href={`/extra-services#${service}`}
                    onClick={() => setMenuOpen(false)}
                    className="block w-full rounded-md px-2 py-2 text-start text-sm text-secondary transition-colors hover:bg-white/[0.05] hover:text-accent"
                  >
                    {t(service)}
                  </Link>
                ))}
              </MobileDropdown>
              </div>
              <motion.a
                href={BOOKING_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                // Close the overlay too — it would otherwise stay open behind
                // the newly opened WhatsApp tab.
                onClick={() => setMenuOpen(false)}
                className="mt-auto flex min-h-12 items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-accent/90"
              >
                {t("book")}
              </motion.a>
              {!authUser ? (
                showSignIn ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.57, duration: 0.7 }}
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}
                  className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
                >
                  {t("auth")}
                </motion.button>
                ) : null
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.57, duration: 0.7 }}
                  className="mt-1 flex items-center gap-3 rounded-lg border border-white/10 p-3"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded bg-accent text-xs font-semibold uppercase text-black">
                    {initials}
                  </span>
                  <span className="text-sm text-secondary">{authUser.name}</span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded border border-white/15 px-4 py-2 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-accent"
                  >
                    {t("signOut")}
                  </button>
                </motion.div>
              )}
            </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onComplete={handleAuthComplete}
      />
    </>
  );
}
