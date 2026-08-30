import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import studioLogo from "@/assets/logo2.svg";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useLanguage } from "@/i18n/languageContext";
import { logout } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { navItems, type NavItem } from "@/utils/navigation";
import {
  ChevronDownIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon
} from "@/components/icons";

/** Remembers the desktop sidebar's collapsed state between visits. */
const SIDEBAR_STORAGE_KEY = "s3aib.admin.sidebarCollapsed";

const linkBase =
  "flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors";

/**
 * Gap and padding for a nav row, by state.
 *
 * Kept out of `linkBase` and applied per state rather than overridden. Two
 * utilities for the same property do not reliably override one another in
 * Tailwind — they have equal specificity, so the one emitted later in the
 * stylesheet wins regardless of the order they appear in the class string.
 * `gap-3` happens to be emitted after `gap-0`, so a "gap-3 … gap-0" row keeps
 * its 12px gap.
 *
 * The gap matters because the label is hidden with `max-w-0` rather than
 * unmounted: it is still a flex child, and a gap beside it makes the centred
 * line "icon + 12px + nothing", putting the icon 6px left of true centre.
 */
const linkExpanded = "gap-3 px-3.5";
const linkCollapsed = "justify-center px-0";
const linkActive = "bg-accent text-white shadow-[0_12px_26px_rgba(200,168,125,0.24)]";
const linkIdle = "text-white/78 hover:bg-white/8 hover:text-white";

/** True when the current route is this child's route or nested under it. */
function matchesRoute(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavGroup({
  item,
  onNavigate,
  collapsed = false
}: {
  item: NavItem;
  onNavigate?: () => void;
  /** Icons-only rail: labels are hidden and the group cannot be expanded. */
  collapsed?: boolean;
}) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  // Driven by the children, not the group's own `to` — a group like "General"
  // collects routes that do not share its path prefix.
  const holdsActiveRoute =
    item.children?.some((child) => matchesRoute(pathname, child.to)) ?? false;
  // Auto-open when a child route is active, but let the user toggle from there.
  const [open, setOpen] = useState(holdsActiveRoute);
  // Collapsed, the group still opens — its children stack as a column of
  // icons. That is only legible because every child carries an icon of its
  // own; a text-only child list would have nothing to show at this width.
  const expanded = open;

  // Re-open on navigation into the group (deep links, links from other pages),
  // without fighting a manual toggle while the route stays put.
  useEffect(() => {
    if (holdsActiveRoute) setOpen(true);
  }, [holdsActiveRoute]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={expanded}
        // Collapsed, the label is not rendered, so the icon needs the name.
        title={collapsed ? t(item.labelEn, item.labelAr) : undefined}
        aria-label={collapsed ? t(item.labelEn, item.labelAr) : undefined}
        className={`${linkBase} w-full ${collapsed ? linkCollapsed : linkExpanded} ${
          holdsActiveRoute && !expanded ? "text-white" : linkIdle
        }`}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {/*
          Labels fade and shrink rather than vanishing, so the rail collapses as
          one motion instead of the text disappearing a frame before the width
          animates.
        */}
        <span
          className={`flex-1 overflow-hidden whitespace-nowrap text-start transition-[opacity,max-width] duration-300 ease-out ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100"
          }`}
        >
          {t(item.labelEn, item.labelAr)}
        </span>
        {collapsed ? null : (
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90 rtl:rotate-90"}`}
          />
        )}
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          expanded ? "mt-1 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`flex flex-col gap-1 transition-transform duration-300 ease-out ${
              // Indented under the parent when there is width for it; flush in
              // the rail, where an indent would push icons off the shared axis.
              collapsed ? "ps-0" : "ps-6"
            } ${expanded ? "translate-y-0" : "-translate-y-2"}`}
          >
            {item.children?.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                tabIndex={expanded ? 0 : -1}
                title={collapsed ? t(child.labelEn, child.labelAr) : undefined}
                className={({ isActive }) =>
                  `flex h-9 w-full items-center rounded-lg text-[12.5px] transition-colors ${
                    collapsed ? linkCollapsed : linkExpanded
                  } ${isActive ? linkActive : linkIdle}`
                }
              >
                <child.icon className="h-4 w-4 shrink-0" />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-out ${
                    collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100"
                  }`}
                >
                  {t(child.labelEn, child.labelAr)}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarLinks({
  onNavigate,
  collapsed = false
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <nav className="flex flex-col gap-1.5 px-4">
      {navItems.map((item) =>
        item.children?.length ? (
          <NavGroup
            key={item.to}
            item={item}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            title={collapsed ? t(item.labelEn, item.labelAr) : undefined}
            className={({ isActive }) =>
              `${linkBase} w-full ${collapsed ? linkCollapsed : linkExpanded} ${
                isActive ? linkActive : linkIdle
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-out ${
                collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100"
              }`}
            >
              {t(item.labelEn, item.labelAr)}
            </span>
          </NavLink>
        )
      )}
    </nav>
  );
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useLanguage();

  return (
    <div
      className={`flex items-center pb-3 pt-5 text-white transition-[padding] duration-300 ease-out ${
        collapsed ? "justify-center px-4" : "gap-4 px-6"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <img
          src={studioLogo}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
      </span>
      <p
        className={`overflow-hidden whitespace-nowrap text-lg font-semibold leading-tight transition-[opacity,max-width] duration-300 ease-out ${
          collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100"
        }`}
      >
        {t("Yehya Al Saib", "يحيى الصعيب")}
      </p>
    </div>
  );
}

function SidebarLogout({
  onLogout,
  collapsed = false
}: {
  onLogout: () => void;
  collapsed?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="mt-auto border-t border-white/10 px-4 py-4">
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? t("Logout", "تسجيل الخروج") : undefined}
        className={`flex h-11 w-full items-center rounded-lg text-[13px] font-medium text-white/78 transition-colors hover:bg-white/8 hover:text-white ${
          collapsed ? linkCollapsed : linkExpanded
        }`}
      >
        <LogoutIcon className="h-5 w-5 shrink-0" />
        <span
          className={`overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-out ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100"
          }`}
        >
          {t("Logout", "تسجيل الخروج")}
        </span>
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const admin = useAuthStore((s) => s.admin);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      // Defaults to expanded: the labels are the navigation, and a first-time
      // user should not have to discover the toggle to read them.
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      // Private mode and blocked site data both throw here.
      return false;
    }
  });
  const [mobileMounted, setMobileMounted] = useState(false);
  const openFrameRef = useRef<number | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* preference is a convenience; ignore storage failures */
    }
  }, [collapsed]);

  useEffect(() => {
    if (mobileOpen) {
      setMobileMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setMobileMounted(false), 240);
    return () => window.clearTimeout(timeout);
  }, [mobileOpen]);

  useEffect(() => {
    return () => {
      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  const openMobileSidebar = () => {
    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
    }
    setMobileMounted(true);
    setMobileOpen(false);
    openFrameRef.current = window.requestAnimationFrame(() => {
      openFrameRef.current = window.requestAnimationFrame(() => {
        setMobileOpen(true);
        openFrameRef.current = null;
      });
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
      setMobileOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-base">
      {/*
        Width is animated rather than toggled between two classes so the rail
        and the page content slide together. `duration-300` matches the nav
        group and label transitions, which keeps the whole collapse reading as
        one movement instead of several racing ones.
      */}
      <aside
        className={`fixed inset-y-0 inset-s-0 hidden flex-col overflow-hidden bg-[#151922] text-white shadow-2xl transition-[width] duration-300 ease-out lg:flex ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_42%)]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <BrandMark collapsed={collapsed} />

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={
              collapsed
                ? t("Expand sidebar", "توسيع القائمة")
                : t("Collapse sidebar", "طي القائمة")
            }
            title={
              collapsed
                ? t("Expand sidebar", "توسيع القائمة")
                : t("Collapse sidebar", "طي القائمة")
            }
            className={`mb-2 flex h-9 items-center rounded-lg text-white/60 transition-colors hover:bg-white/8 hover:text-white ${
              collapsed
                ? // `self-stretch` makes this the same 48px box as a nav link
                  // inside the nav's own px-4 gutter, so the chevron lands on
                  // the exact axis the icons below it use. Left implicit it
                  // would depend on the parent's default stretch, which the
                  // expanded state's `self-end` overrides.
                  "mx-4 self-stretch justify-center"
                : "mx-4 self-end justify-center px-2"
            }`}
          >
            {/*
              One chevron rotated per state and per writing direction. The
              sidebar sits on the right in RTL, so "collapse" points the
              opposite way there.
            */}
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-300 ease-out ${
                collapsed ? "-rotate-90 rtl:rotate-90" : "rotate-90 rtl:-rotate-90"
              }`}
            />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain  scrollbar-thin scrollbar-track-transparent">
            <SidebarLinks collapsed={collapsed} />
          </div>
          <SidebarLogout collapsed={collapsed} onLogout={() => void handleLogout()} />
        </div>
      </aside>

      {mobileMounted ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t("Close menu", "إغلاق القائمة")}
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ease-out ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            className={`absolute inset-y-0 inset-s-0 flex w-72 flex-col bg-[#151922] text-white shadow-2xl transition-transform duration-300 ease-out ${
              mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
            }`}
          >
            <div className="flex h-14 items-center justify-between px-5">
              <p className="font-display text-sm font-semibold text-white">
                Yehya<span className="text-accent">.</span> AlS3aib
              </p>
              <button
                type="button"
                aria-label={t("Close menu", "إغلاق القائمة")}
                onClick={() => setMobileOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SidebarLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarLogout onLogout={() => void handleLogout()} />
          </aside>
        </div>
      ) : null}

      {/* Offset follows the rail's width, with the same easing, so the content
          edge stays glued to the sidebar for the whole transition. */}
      <div
        className={`transition-[padding] duration-300 ease-out ${
          collapsed ? "lg:ps-20" : "lg:ps-72"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-base/90 px-5 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            aria-label={t("Open menu", "فتح القائمة")}
            onClick={openMobileSidebar}
            className="text-secondary hover:text-primary"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-secondary">{admin?.name ?? admin?.email}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold uppercase text-accent">
              {(admin?.name ?? admin?.email ?? "?").slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="px-4 py-4 sm:px-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
