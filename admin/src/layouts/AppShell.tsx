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

const linkBase =
  "flex h-10 items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium transition-colors";
const linkActive = "bg-accent text-white shadow-[0_12px_26px_rgba(200,168,125,0.24)]";
const linkIdle = "text-white/78 hover:bg-white/8 hover:text-white";

/** True when the current route is this child's route or nested under it. */
function matchesRoute(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavGroup({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  // Driven by the children, not the group's own `to` — a group like "General"
  // collects routes that do not share its path prefix.
  const holdsActiveRoute =
    item.children?.some((child) => matchesRoute(pathname, child.to)) ?? false;
  // Auto-open when a child route is active, but let the user toggle from there.
  const [open, setOpen] = useState(holdsActiveRoute);

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
        aria-expanded={open}
        className={`${linkBase} w-full ${holdsActiveRoute && !open ? "text-white" : linkIdle}`}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-start">{t(item.labelEn, item.labelAr)}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "" : "-rotate-90 rtl:rotate-90"}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          open ? "mt-1 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`flex flex-col gap-1 ps-6 transition-transform duration-300 ease-out ${
              open ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            {item.children?.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                tabIndex={open ? 0 : -1}
                className={({ isActive }) =>
                  `flex h-9 w-full items-center rounded-lg px-3.5 text-[12.5px] transition-colors ${
                    isActive ? linkActive : linkIdle
                  }`
                }
              >
                {t(child.labelEn, child.labelAr)}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();

  return (
    <nav className="flex flex-col gap-1.5 px-4">
      {navItems.map((item) =>
        item.children?.length ? (
          <NavGroup key={item.to} item={item} onNavigate={onNavigate} />
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) => `${linkBase} w-full ${isActive ? linkActive : linkIdle}`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{t(item.labelEn, item.labelAr)}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}

function BrandMark() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-4 px-6 pb-3 pt-5 text-white">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <img
          src={studioLogo}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
      </span>
      <p className="text-lg font-semibold leading-tight">{t("Yehya Al Saib", "يحيى الصعيب")}</p>
    </div>
  );
}

function SidebarLogout({ onLogout }: { onLogout: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="mt-auto border-t border-white/10 px-4 py-4">
      <button
        type="button"
        onClick={onLogout}
        className="flex h-11 w-full items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium text-white/78 transition-colors hover:bg-white/8 hover:text-white"
      >
        <LogoutIcon className="h-5 w-5 shrink-0" />
        <span>{t("Logout", "تسجيل الخروج")}</span>
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const admin = useAuthStore((s) => s.admin);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const openFrameRef = useRef<number | null>(null);
  const { t } = useLanguage();

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
      <aside className="fixed inset-y-0 inset-s-0 hidden w-72 flex-col overflow-hidden bg-[#151922] text-white shadow-2xl lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_42%)]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <BrandMark />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain  scrollbar-thin scrollbar-track-transparent">
            <SidebarLinks />
          </div>
          <SidebarLogout onLogout={() => void handleLogout()} />
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

      <div className="lg:ps-72">
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
