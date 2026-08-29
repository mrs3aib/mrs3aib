import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
  FolderIcon,
  SearchIcon
} from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { LogoLoader } from "@/components/LogoLoader";
import { useLanguage } from "@/i18n/languageContext";
import { useSessionsQuery } from "@/hooks/useSessions";
import {
  CATEGORY_LABELS,
  SESSION_CATEGORIES,
  type SessionCategory
} from "@/types/category";
import type { PhotoSession } from "@/types/session";
import { formatDate } from "@/utils/format";
import { exportSessionsCsv } from "./sessions/sessionPageUtils";

type Icon = ComponentType<{ className?: string }>;

type Bilingual = { en: string; ar: string };

/**
 * Colour per session category. Keys match `SESSION_CATEGORIES`, so every
 * session the API returns has a swatch without any mapping guesswork.
 */
const categoryStyles: Record<
  SessionCategory,
  { dot: string; chip: string; tone: string }
> = {
  weddings: {
    dot: "bg-[#5b8def]",
    chip: "bg-[#eaf1ff] text-[#3f6fc4]",
    tone: "from-[#493528] to-[#d1aa74]"
  },
  companies: {
    dot: "bg-[#3f7a53]",
    chip: "bg-[#e7f4ec] text-[#3f7a53]",
    tone: "from-[#20242d] to-[#d5a26d]"
  },
  restaurants: {
    dot: "bg-[#e8a33d]",
    chip: "bg-[#fdf1de] text-[#b87223]",
    tone: "from-[#6d4a2f] to-[#d8a45c]"
  },
  events: {
    dot: "bg-[#8b7ada]",
    chip: "bg-[#efecfb] text-[#6d5cc4]",
    tone: "from-[#203046] to-[#c79d78]"
  },
  products: {
    dot: "bg-[#e2607a]",
    chip: "bg-[#fdeaee] text-[#c2455f]",
    tone: "from-[#191b1e] to-[#d6c0a0]"
  },
  realEstate: {
    dot: "bg-[#4aa3a3]",
    chip: "bg-[#e6f4f4] text-[#2f7d7d]",
    tone: "from-[#28303b] to-[#8fa6b8]"
  },
  drone: {
    dot: "bg-[#7a8fa6]",
    chip: "bg-[#eef2f6] text-[#516378]",
    tone: "from-[#2f3a44] to-[#9fb3c6]"
  },
  cinematicVideo: {
    dot: "bg-[#b0763d]",
    chip: "bg-[#f7ecdf] text-[#8b5b19]",
    tone: "from-[#14171b] to-[#b68a57]"
  }
};

const weekdays: Bilingual[] = [
  { en: "Sun", ar: "الأحد" },
  { en: "Mon", ar: "الاثنين" },
  { en: "Tue", ar: "الثلاثاء" },
  { en: "Wed", ar: "الأربعاء" },
  { en: "Thu", ar: "الخميس" },
  { en: "Fri", ar: "الجمعة" },
  { en: "Sat", ar: "السبت" }
];

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  delta,
  caption,
  icon: Icon
}: {
  label: string;
  value: string;
  delta?: string;
  caption?: string;
  icon: Icon;
}) {
  const { t } = useLanguage();

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">{value}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f3ede4] text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-secondary">
        {delta ? (
          <>
            <span className="text-success">↑ {delta}</span>{" "}
            {t("vs last month", "عن الشهر الماضي")}
          </>
        ) : (
          caption
        )}
      </p>
    </Card>
  );
}

/**
 * Builds a 6x7 month grid, padding the leading/trailing cells with the
 * neighbouring months so the calendar always renders a full rectangle.
 * Each cell carries its real date so sessions can be matched to it.
 */
function useMonthGrid(year: number, month: number) {
  return useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const offset = index - firstWeekday;
      const date = new Date(year, month, offset + 1);
      return {
        date,
        day: date.getDate(),
        current: offset >= 0 && offset < daysInMonth
      };
    });
  }, [year, month]);
}

/** Local-time YYYY-MM-DD key, so sessions land on the day the admin sees. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function MonthCalendar({
  sessions,
  toolbar
}: {
  sessions: PhotoSession[];
  toolbar?: ReactNode;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth()
  });
  const cells = useMonthGrid(cursor.year, cursor.month);
  const { t, language } = useLanguage();

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    language === "ar" ? "ar" : "en-US",
    { month: "long", year: "numeric" }
  );

  /** Sessions bucketed by the day their event falls on. */
  const byDay = useMemo(() => {
    const map = new Map<string, PhotoSession[]>();
    for (const session of sessions) {
      const date = new Date(session.eventDate);
      if (Number.isNaN(date.getTime())) continue;
      const key = dayKey(date);
      map.set(key, [...(map.get(key) ?? []), session]);
    }
    return map;
  }, [sessions]);

  /** Only categories actually present this month appear in the legend. */
  const legend = useMemo(() => {
    const present = new Set<SessionCategory>();
    for (const cell of cells) {
      if (!cell.current) continue;
      for (const session of byDay.get(dayKey(cell.date)) ?? []) {
        present.add(session.category);
      }
    }
    return [...present];
  }, [cells, byDay]);

  const step = (delta: number) =>
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 items-center rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary"
              onClick={() =>
                setCursor({ year: today.getFullYear(), month: today.getMonth() })
              }
            >
              {t("Today", "اليوم")}
            </button>
            <button
              type="button"
              aria-label={t("Previous month", "الشهر السابق")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-secondary transition-colors hover:border-accent hover:text-primary"
              onClick={() => step(-1)}
            >
              <ChevronDownIcon className="h-4 w-4 rotate-90" />
            </button>
            <button
              type="button"
              aria-label={t("Next month", "الشهر التالي")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-secondary transition-colors hover:border-accent hover:text-primary"
              onClick={() => step(1)}
            >
              <ChevronDownIcon className="h-4 w-4 -rotate-90" />
            </button>
          </div>
          <div className="flex h-9 min-w-40 items-center justify-center rounded-lg border border-line px-4 text-sm text-primary">
            {monthLabel}
          </div>
        </div>

        {toolbar ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">{toolbar}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-7 border-b border-line">
        {weekdays.map((weekday) => (
          <div
            key={weekday.en}
            className="px-3 py-3 text-center text-xs font-medium text-secondary"
          >
            {t(weekday.en, weekday.ar)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          const daySessions = cell.current ? (byDay.get(dayKey(cell.date)) ?? []) : [];
          const isToday = dayKey(cell.date) === dayKey(today);

          return (
            <div
              key={index}
              className={`min-h-24 border-b border-e border-line p-2 last:border-e-0 [&:nth-child(7n)]:border-e-0 ${
                cell.current ? "bg-card" : "bg-base/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-accent font-medium text-white"
                    : cell.current
                      ? "text-primary"
                      : "text-secondary/45"
                }`}
              >
                {cell.day}
              </span>

              {/* Two chips keep the row height stable; the rest roll up. */}
              {daySessions.slice(0, 2).map((session) => {
                const style = categoryStyles[session.category];
                return (
                  <span
                    key={session.id}
                    title={session.title}
                    className={`mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${style.chip}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                    <span className="truncate">{session.title}</span>
                  </span>
                );
              })}
              {daySessions.length > 2 ? (
                <span className="mt-1 block ps-1 text-[10px] text-secondary">
                  {t(
                    `+${daySessions.length - 2} more`,
                    `+${daySessions.length - 2} أخرى`
                  )}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {legend.length ? (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3">
          {legend.map((category) => (
            <span
              key={category}
              className="flex items-center gap-2 text-xs text-secondary"
            >
              <span className={`h-2 w-2 rounded-full ${categoryStyles[category].dot}`} />
              {t(CATEGORY_LABELS[category].en, CATEGORY_LABELS[category].ar)}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/** Hex values matching `categoryStyles`, needed for the conic gradient. */
const categoryHex: Record<SessionCategory, string> = {
  weddings: "#5b8def",
  companies: "#3f7a53",
  restaurants: "#e8a33d",
  events: "#8b7ada",
  products: "#e2607a",
  realEstate: "#4aa3a3",
  drone: "#7a8fa6",
  cinematicVideo: "#b0763d"
};

function DonutChart({
  slices
}: {
  slices: { category: SessionCategory; percent: number }[];
}) {
  const gradient = useMemo(() => {
    if (!slices.length) return "conic-gradient(var(--color-line) 0 100%)";
    let cursor = 0;
    const stops = slices.map((slice) => {
      const start = cursor;
      cursor += slice.percent;
      return `${categoryHex[slice.category]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [slices]);

  return (
    <div
      className="relative h-32 w-32 shrink-0 rounded-full"
      style={{ background: gradient }}
    >
      <span className="absolute inset-8 rounded-full bg-card" />
    </div>
  );
}

export default function BookingsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // One generous page: enough to populate the calendar, stats and panels
  // without paging. The list endpoint has no date-range filter.
  const { data, isPending, isError, refetch } = useSessionsQuery({
    page: 1,
    pageSize: 200
  });
  const allSessions = useMemo(() => data?.items ?? [], [data?.items]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SessionCategory | "">("");
  const [filterOpen, setFilterOpen] = useState(false);

  /**
   * Everything on this page — calendar, stats, upcoming list, breakdown —
   * reads from this, so the search box and category filter narrow the whole
   * view at once rather than only one panel.
   */
  const sessions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allSessions.filter((session) => {
      if (categoryFilter && session.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        session.title.toLowerCase().includes(term) ||
        session.location.toLowerCase().includes(term)
      );
    });
  }, [allSessions, search, categoryFilter]);

  /** Categories that actually exist in the data, so the menu offers no dead options. */
  const availableCategories = useMemo(() => {
    const present = new Set<SessionCategory>();
    for (const session of allSessions) present.add(session.category);
    return SESSION_CATEGORIES.filter((category) => present.has(category));
  }, [allSessions]);

  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  /** Counts driving the three stat cards. */
  const stats = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let pastCount = 0;

    for (const session of sessions) {
      const date = new Date(session.eventDate);
      if (Number.isNaN(date.getTime())) continue;
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === startOfToday.getTime()) todayCount += 1;
      else if (date.getTime() > startOfToday.getTime()) upcomingCount += 1;
      else pastCount += 1;
    }

    return { todayCount, upcomingCount, pastCount };
  }, [sessions, startOfToday]);

  /** Next five sessions from today onwards, soonest first. */
  const upcoming = useMemo(
    () =>
      sessions
        .filter((session) => {
          const date = new Date(session.eventDate);
          return (
            !Number.isNaN(date.getTime()) && date.getTime() >= startOfToday.getTime()
          );
        })
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
        .slice(0, 5),
    [sessions, startOfToday]
  );

  /** Share of sessions per category, largest first. */
  const breakdown = useMemo(() => {
    const counts = new Map<SessionCategory, number>();
    for (const session of sessions) {
      counts.set(session.category, (counts.get(session.category) ?? 0) + 1);
    }
    const total = sessions.length || 1;
    return [...counts.entries()]
      .map(([category, count]) => ({
        category,
        count,
        percent: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  const calendarToolbar = (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFilterOpen((open) => !open);
          }}
          aria-expanded={filterOpen}
          className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border bg-card px-5 text-sm transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            categoryFilter ? "border-accent text-primary" : "border-line text-secondary"
          }`}
        >
          <FolderIcon className="h-4 w-4 shrink-0" />
          {categoryFilter
            ? CATEGORY_LABELS[categoryFilter][language]
            : t("Filter", "تصفية")}
        </button>

        {filterOpen ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-20 mt-2 min-w-52 rounded-lg border border-line bg-card p-1.5 shadow-xl shadow-black/10"
          >
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("");
                setFilterOpen(false);
              }}
              className={`block w-full rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-base ${
                categoryFilter === "" ? "font-medium text-primary" : "text-secondary"
              }`}
            >
              {t("All categories", "كل التصنيفات")}
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setCategoryFilter(category);
                  setFilterOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-base ${
                  categoryFilter === category
                    ? "font-medium text-primary"
                    : "text-secondary"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${categoryStyles[category].dot}`}
                />
                {CATEGORY_LABELS[category][language]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 sm:max-w-xs">
        <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-secondary/60"
          placeholder={t("Search bookings...", "ابحث في الحجوزات...")}
        />
      </label>

      {/* Only offered when it would do something, so the row stays quiet
                in the common unfiltered case. */}
      {search || categoryFilter ? (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setCategoryFilter("");
          }}
          className="text-xs text-secondary underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("Clear filters", "مسح عوامل التصفية")}
        </button>
      ) : null}
    </>
  );

  if (isError) {
    return (
      <Card className="p-5">
        <p className="text-sm text-danger">
          {t("Could not load bookings.", "تعذر تحميل الحجوزات.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </Card>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LogoLoader />
      </div>
    );
  }

  return (
    // Clicking anywhere else dismisses the filter menu, the same way the
    // sessions list closes its row menus.
    <div className="space-y-5" onClick={() => setFilterOpen(false)}>
      {/* Header and stats span the full width, above the calendar/aside split. */}
      <Card className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-7 w-7 text-accent" />
            <h1 className="text-3xl font-semibold text-primary">
              {t("Bookings", "الحجوزات")}
            </h1>
          </div>
          <p className="mt-2 text-sm text-secondary">
            {t(
              "Manage appointments, upcoming sessions, and event scheduling with ease",
              "إدارة المواعيد والجلسات القادمة وجدولة الأحداث بسهولة"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <NotificationBell size="lg" />
          <button
            type="button"
            // Exports what the page is currently showing, so a filtered view
            // and its export never disagree.
            onClick={() => exportSessionsCsv(sessions)}
            disabled={sessions.length === 0}
            className="flex h-11 items-center gap-3 rounded-lg bg-[#171b24] px-5 text-sm font-medium text-white shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <DownloadIcon className="h-5 w-5" />
            {t("Export Bookings", "تصدير الحجوزات")}
          </button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("Today's Bookings", "حجوزات اليوم")}
          value={`${stats.todayCount}`}
          caption={t("Sessions scheduled today", "جلسات مجدولة اليوم")}
          icon={CalendarIcon}
        />
        <StatCard
          label={t("Upcoming", "القادمة")}
          value={`${stats.upcomingCount}`}
          caption={t("Scheduled after today", "مجدولة بعد اليوم")}
          icon={CheckCircleIcon}
        />
        <StatCard
          label={t("Past Sessions", "الجلسات السابقة")}
          value={`${stats.pastCount}`}
          caption={t("Already taken place", "تمت بالفعل")}
          icon={ClockIcon}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          {/* A filtered view that matches nothing would otherwise look like a
              loading failure — an empty calendar with no explanation. */}
          {sessions.length === 0 && allSessions.length > 0 ? (
            <p className="text-sm text-secondary">
              {t(
                "No bookings match your filters.",
                "لا توجد حجوزات تطابق عوامل التصفية."
              )}
            </p>
          ) : null}

          <MonthCalendar sessions={sessions} toolbar={calendarToolbar} />
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-primary">
              {t("Upcoming Events", "الأحداث القادمة")}
            </h2>
            <div className="mt-4 space-y-4">
              {upcoming.length ? (
                upcoming.map((session) => {
                  const style = categoryStyles[session.category];
                  return (
                    <div key={session.id} className="flex items-center gap-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                      <div
                        className={`h-11 w-14 shrink-0 rounded-md bg-gradient-to-br ${style.tone}`}
                      >
                        <div className="h-full rounded-md bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.4),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-primary">
                          {session.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-secondary">
                          {session.location ||
                            t(
                              CATEGORY_LABELS[session.category].en,
                              CATEGORY_LABELS[session.category].ar
                            )}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="text-xs text-secondary">
                          {formatDate(session.eventDate, language)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-secondary">
                  {t("No upcoming sessions.", "لا توجد جلسات قادمة.")}
                </p>
              )}
            </div>
            <button
              type="button"
              // The sessions list is the full, pageable view of these same
              // records. It has no `sort` deep link, so it opens on its own
              // default ordering.
              onClick={() => navigate("/sessions")}
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm text-secondary transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {t("View All Events", "عرض كل الأحداث")}
              <ChevronDownIcon className="h-4 w-4 -rotate-90 rtl:rotate-90" />
            </button>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-primary">
              {t("Bookings by Type", "توزيع الحجوزات حسب النوع")}
            </h2>
            {breakdown.length ? (
              <>
                <div className="mt-4 flex items-center gap-5">
                  <DonutChart slices={breakdown} />
                  <div className="flex-1 space-y-2">
                    {breakdown.map((item) => (
                      <div
                        key={item.category}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-sm ${categoryStyles[item.category].dot}`}
                        />
                        <span className="truncate text-secondary">
                          {t(
                            CATEGORY_LABELS[item.category].en,
                            CATEGORY_LABELS[item.category].ar
                          )}
                        </span>
                        <span className="font-semibold text-primary">
                          {item.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                  <span className="text-secondary">{t("Total", "الإجمالي")}</span>
                  <span className="font-semibold text-primary">{sessions.length}</span>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-secondary">
                {t("No sessions yet.", "لا توجد جلسات بعد.")}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
