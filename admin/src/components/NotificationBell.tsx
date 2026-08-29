import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  CheckCircleIcon,
  DownloadIcon,
  ImageIcon,
  UsersIcon
} from "@/components/icons";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/i18n/languageContext";
import { formatRelativeTime } from "@/utils/format";
import type { NotificationKind } from "@/types/notification";

const KIND_STYLES: Record<NotificationKind, { icon: typeof BellIcon; tone: string }> = {
  download: { icon: DownloadIcon, tone: "bg-[#eaf3ff] text-[#437fce]" },
  mediaAdded: { icon: ImageIcon, tone: "bg-success/10 text-success" },
  mediaFailed: { icon: CheckCircleIcon, tone: "bg-danger/10 text-danger" },
  clientAdded: { icon: UsersIcon, tone: "bg-[#f3ede4] text-[#9f733d]" }
};

/**
 * Bell + dropdown feed, shared by every page header.
 *
 * `size` matches the two button treatments already in use: pages built around
 * bordered header buttons pass "md", the borderless ones pass "lg".
 */
export function NotificationBell({ size = "md" }: { size?: "md" | "lg" }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { items, unreadCount, markAllRead, isUnread, isPending, isError } =
    useNotifications();

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const button = containerRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const viewportPadding = 16;
      const width = Math.min(384, window.innerWidth - viewportPadding * 2);
      // In RTL the panel opens from the button's left edge, so it expands to
      // the right instead of being pushed off-screen to the left.
      const preferredLeft = language === "ar" ? rect.left : rect.right - width;
      const left = Math.min(
        Math.max(viewportPadding, preferredLeft),
        window.innerWidth - width - viewportPadding
      );
      const top = Math.min(rect.bottom + 8, window.innerHeight - viewportPadding);

      setPanelStyle({
        position: "fixed",
        top,
        left,
        width,
        maxWidth: `calc(100vw - ${viewportPadding * 2}px)`
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [language, open]);

  const toggle = () => {
    setOpen((value) => {
      // Opening the panel is what marks the current feed as seen.
      if (!value) markAllRead();
      return !value;
    });
  };

  const button =
    size === "lg"
      ? "relative flex h-11 w-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-line"
      : "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-primary transition-colors hover:border-accent hover:bg-base/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-label={t("Notifications", "الإشعارات")}
        aria-expanded={open}
        aria-haspopup="true"
        className={button}
      >
        <BellIcon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d6a756] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          dir={language === "ar" ? "rtl" : "ltr"}
          className="z-[80] overflow-hidden rounded-lg border border-line bg-card shadow-2xl shadow-black/15"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-primary">
              {t("Notifications", "الإشعارات")}
            </p>
            <span className="text-xs text-secondary">
              {t("Last 30 days", "آخر 30 يوم")}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isError ? (
              <p className="px-4 py-10 text-center text-sm text-danger">
                {t("Could not load notifications.", "تعذر تحميل الإشعارات.")}
              </p>
            ) : isPending ? (
              <p className="px-4 py-10 text-center text-sm text-secondary">
                {t("Loading...", "جارٍ التحميل...")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-secondary">
                {t("Nothing new right now.", "لا يوجد جديد حالياً.")}
              </p>
            ) : (
              <ul>
                {items.map((item) => {
                  const { icon: Icon, tone } = KIND_STYLES[item.kind];
                  const unread = isUnread(item.createdAt);

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate(item.href);
                        }}
                        className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-start transition-colors last:border-0 hover:bg-base/70 ${
                          unread ? "bg-accent/5" : ""
                        }`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-primary">
                              {t(item.titleEn, item.titleAr)}
                            </span>
                            {unread ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-secondary">
                            {t(item.bodyEn, item.bodyAr)}
                          </span>
                          <span className="mt-1 block text-[11px] text-secondary/70">
                            {formatRelativeTime(item.createdAt, language)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
