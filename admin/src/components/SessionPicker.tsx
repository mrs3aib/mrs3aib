import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import { CalendarIcon, CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/icons";
import { useSessionQuery, useSessionsQuery } from "@/hooks/useSessions";
import { useLanguage } from "@/i18n/languageContext";
import { CATEGORY_LABELS, type SessionCategory } from "@/types/category";
import type { PhotoSession } from "@/types/session";
import { formatDate, formatNumber } from "@/utils/format";
import { SessionCover } from "@/pages/sessions/SessionCover";

type SessionPickerProps = {
  value: string;
  onChange: (sessionId: string) => void;
  onSelectedSessionChange?: (session: PhotoSession | null) => void;
  emptyLabel?: string;
  emptyHint?: string;
  clearLabel?: string;
  category?: SessionCategory;
  className?: string;
};

export function SessionPicker({
  value,
  onChange,
  onSelectedSessionChange,
  emptyLabel,
  emptyHint,
  clearLabel,
  category,
  className = ""
}: SessionPickerProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const rootRef = useRef<HTMLDivElement | null>(null);

  const {
    data: sessionsData,
    isPending: sessionsPending,
    isFetching
  } = useSessionsQuery({
    page: 1,
    pageSize: 8,
    ...(category ? { category } : {}),
    search: deferredSearch || undefined
  });
  const { data: selectedSessionDetail } = useSessionQuery(value);

  const sessions = sessionsData?.items ?? [];
  const selectedSession =
    selectedSessionDetail ?? sessions.find((session) => session.id === value) ?? null;
  const resultLabel = useMemo(() => {
    if (sessionsPending) return t("Loading sessions...", "جاري تحميل الجلسات...");
    if (deferredSearch) {
      return t(
        `${formatNumber(sessions.length)} matching sessions`,
        `${formatNumber(sessions.length)} جلسات مطابقة`
      );
    }
    return t("Recent sessions", "أحدث الجلسات");
  }, [deferredSearch, sessions.length, sessionsPending, t]);

  useEffect(() => {
    onSelectedSessionChange?.(selectedSession);
  }, [onSelectedSessionChange, selectedSession]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const selectSession = (session: PhotoSession) => {
    onChange(session.id);
    setSearch("");
    setOpen(false);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" && sessions.length > 0) {
      event.preventDefault();
      selectSession(sessions[0]!);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-line bg-card px-3 py-2 text-start transition-colors hover:border-accent focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        aria-expanded={open}
      >
        {selectedSession ? (
          <>
            <SessionCover
              session={selectedSession}
              className="h-11 w-14 shrink-0"
              roundedClassName="rounded-md"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-primary">
                {selectedSession.title}
              </span>
              <span className="mt-1 block truncate text-xs text-secondary">
                {CATEGORY_LABELS[selectedSession.category][language]} ·{" "}
                {formatDate(selectedSession.eventDate, language)}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-base text-secondary">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-primary">
                {emptyLabel ?? t("Select a session", "اختر جلسة")}
              </span>
              <span className="mt-1 block text-xs text-secondary">
                {emptyHint ?? t("Search by title, date, or location", "ابحث بالعنوان أو التاريخ أو الموقع")}
              </span>
            </span>
          </>
        )}
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setSearch("");
          }}
          className="mt-2 text-xs font-medium text-danger underline underline-offset-2"
        >
          {clearLabel ?? t("Clear selected session", "مسح الجلسة المحددة")}
        </button>
      ) : null}

      {open ? (
        <div className="absolute end-0 start-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-card shadow-2xl shadow-black/15">
          <label className="flex h-12 items-center gap-2 border-b border-line px-3">
            <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onSearchKeyDown}
              autoFocus
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-secondary/60"
              placeholder={t("Search sessions...", "ابحث في الجلسات...")}
            />
            {isFetching ? (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : null}
          </label>

          <div className="max-h-80 overflow-y-auto p-2">
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-[0.18em] text-secondary">
              {resultLabel}
            </p>
            {sessions.length ? (
              <div className="space-y-1">
                {sessions.map((session) => {
                  const active = session.id === value;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => selectSession(session)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors ${
                        active ? "bg-accent/12" : "hover:bg-base"
                      }`}
                    >
                      <SessionCover
                        session={session}
                        className="h-12 w-16 shrink-0"
                        roundedClassName="rounded-md"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-primary">
                          {session.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-secondary">
                          {session.location || CATEGORY_LABELS[session.category][language]}
                        </span>
                        <span className="mt-1 block text-xs text-secondary/80">
                          {formatDate(session.eventDate, language)} ·{" "}
                          {formatNumber(session.mediaCount)} {t("files", "ملفات")}
                        </span>
                      </span>
                      {active ? <CheckIcon className="h-4 w-4 shrink-0 text-accent" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-2 py-8 text-center text-sm text-secondary">
                {sessionsPending
                  ? t("Loading sessions...", "جاري تحميل الجلسات...")
                  : t("No sessions found.", "لم يتم العثور على جلسات.")}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
