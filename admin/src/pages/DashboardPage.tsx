import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogoLoader } from "@/components/LogoLoader";
import {
  CalendarIcon,
  DatabaseIcon,
  DownloadIcon,
  EyeIcon,
  ImageIcon,
  PlusIcon,
  UsersIcon
} from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { CATEGORY_ICONS } from "@/utils/categoryIcons";
import { useLanguage } from "@/i18n/languageContext";
import { useDashboardStatsQuery } from "@/hooks/useDashboardStats";
import { useSessionsQuery } from "@/hooks/useSessions";
import { useClientsQuery } from "@/hooks/useClients";
import { useDownloadsQuery } from "@/hooks/useDownloads";
import { useAuthStore } from "@/store/authStore";
import {
  formatBytes,
  formatDate,
  formatNumber,
  formatRelativeTime
} from "@/utils/format";
import { CATEGORY_LABELS, SESSION_CATEGORIES, type SessionCategory } from "@/types/category";
import { SessionCover } from "./sessions/SessionCover";

type Icon = ComponentType<{ className?: string }>;

/** Avatar gradients, cycled so each live row gets a stable colour. */
const AVATAR_TONES = [
  "bg-[#d9bf93]",
  "bg-[#ead1bd]",
  "bg-[#b9c1bd]",
  "bg-[#a98f78]"
];

/** Medal colours for the top-downloads ranking. */
const RANK_COLORS = [
  "bg-[#f2c14e] text-white",
  "bg-[#e2e5ea] text-secondary",
  "bg-[#d8a552] text-white",
  "bg-line text-secondary"
];

function SessionCategoryOption({
  category,
  label,
  onSelect
}: {
  category: SessionCategory;
  label: string;
  onSelect: (category: SessionCategory) => void;
}) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <button
      type="button"
      onClick={() => onSelect(category)}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm text-primary transition-colors hover:bg-base"
    >
      <span>{label}</span>
      <Icon className="h-4 w-4 text-secondary" />
    </button>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}>
      {children}
    </section>
  );
}

/**
 * Panel title with an optional "View all" link.
 *
 * `to` is required for the button to appear. It previously rendered
 * unconditionally with no handler at all — it hovered and looked clickable but
 * did nothing, which reads as a broken dashboard rather than a decorative
 * heading. A panel with nowhere to go now shows no button.
 */
function PanelHeader({
  title,
  action,
  to
}: {
  title: string;
  action?: string;
  /** Route the button opens. Omitted for panels with no list behind them. */
  to?: string;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      {to ? (
        <button
          type="button"
          onClick={() => navigate(to)}
          className="rounded-md border border-line bg-base px-4 py-2 text-xs text-secondary transition-colors hover:border-accent hover:text-primary"
        >
          {action ?? t("View all", "عرض الكل")}
        </button>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  footnote,
  icon: Icon
}: {
  label: string;
  value: string;
  /** Optional context line. Omitted when there is no real figure to show. */
  footnote?: string;
  icon: Icon;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-primary">{value}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eee9e2] text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-secondary">
        {footnote}
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const admin = useAuthStore((s) => s.admin);
  const { data, isPending, isError, error, refetch, isFetching } =
    useDashboardStatsQuery();
  const { t, language } = useLanguage();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addMenuOpen) return;

    const closeIfOutside = (event: MouseEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAddMenuOpen(false);
    };

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [addMenuOpen]);

  // Panel content: the most recent few rows from each list endpoint.
  const { data: sessionsData } = useSessionsQuery({ page: 1, pageSize: 4 });
  const { data: clientsData } = useClientsQuery({ page: 1, pageSize: 4 });
  const { data: downloadsData } = useDownloadsQuery({ page: 1, pageSize: 20 });

  // Memoised so the `?? []` fallback doesn't produce a new array identity on
  // every render and defeat the memos below.
  const recentSessions = useMemo(() => sessionsData?.items ?? [], [sessionsData?.items]);
  const recentClients = useMemo(() => clientsData?.items ?? [], [clientsData?.items]);
  const recentDownloads = useMemo(
    () => downloadsData?.items ?? [],
    [downloadsData?.items]
  );

  /**
   * "Most downloaded sessions" — the API has no aggregate endpoint, so tally
   * the recent download records client-side and take the top four.
   */
  const topDownloads = useMemo(() => {
    const tally = new Map<string, { title: string; count: number }>();
    for (const record of recentDownloads) {
      const existing = tally.get(record.sessionId);
      tally.set(record.sessionId, {
        title: record.sessionTitle,
        count: (existing?.count ?? 0) + record.mediaCount
      });
    }
    return [...tally.entries()]
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [recentDownloads]);

  /**
   * Downloads per day over the last two weeks, built from the download
   * records' own timestamps. Only covers the records the list endpoint
   * returned, so it reflects recent activity rather than all history.
   */
  const downloadSeries = useMemo(() => {
    const DAYS = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: DAYS }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAYS - 1 - index));
      return { date, count: 0 };
    });

    for (const record of recentDownloads) {
      const stamp = new Date(record.timestamp);
      stamp.setHours(0, 0, 0, 0);
      const offset = Math.round((stamp.getTime() - buckets[0]!.date.getTime()) / 86_400_000);
      const bucket = buckets[offset];
      if (bucket) bucket.count += 1;
    }

    const peak = Math.max(1, ...buckets.map((bucket) => bucket.count));
    const points = buckets
      .map((bucket, index) => {
        const x = (index / (DAYS - 1)) * 398;
        const y = 170 - (bucket.count / peak) * 170;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { buckets, peak, points };
  }, [recentDownloads]);

  /** Recent activity, merged from the newest sessions, clients and downloads. */
  const activities = useMemo(() => {
    const entries: {
      key: string;
      icon: Icon;
      title: string;
      meta: string;
      at: string;
      tone: string;
    }[] = [
      ...recentSessions.map((session) => ({
        key: `session-${session.id}`,
        icon: CalendarIcon,
        title: t("New session created", "تم إنشاء جلسة جديدة"),
        meta: session.title,
        at: session.createdAt,
        tone: "bg-[#eef1f5]"
      })),
      ...recentClients.map((client) => ({
        key: `client-${client.id}`,
        icon: UsersIcon,
        title: t("New client registered", "تم تسجيل عميل جديد"),
        meta: client.name,
        at: client.createdAt,
        tone: "bg-[#f7f1e6]"
      })),
      ...recentDownloads.slice(0, 4).map((record) => ({
        key: `download-${record.id}`,
        icon: DownloadIcon,
        title: t(
          `${record.mediaCount} file(s) downloaded`,
          `تم تنزيل ${record.mediaCount} ملف`
        ),
        meta: record.sessionTitle,
        at: record.timestamp,
        tone: "bg-[#edf4ef]"
      }))
    ];

    return entries
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5);
  }, [recentSessions, recentClients, recentDownloads, t]);

  if (isError) {
    return (
      <Card className="p-5">
        <p className="text-sm text-danger">
          {error instanceof Error
            ? error.message
            : t("Could not load dashboard statistics.", "تعذر تحميل إحصائيات لوحة التحكم.")}
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

  if (isPending || !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LogoLoader />
      </div>
    );
  }

  // Null means the bucket could not be reached. Formatting it as a size would
  // read as a confident "0 B" — an empty bucket and an unreachable one are not
  // the same thing, and only one of them is a problem to act on.
  const storageUsed =
    data.storageUsageBytes === null
      ? t("Unavailable", "غير متاح")
      : formatBytes(data.storageUsageBytes);
  const imageTotal = data.totalImages + data.totalVideos;
  const openAddSession = (category: SessionCategory) => {
    setAddMenuOpen(false);
    navigate(`/cms/categories/${category}?tab=sessions&add=1`);
  };

  return (
    <div className="space-y-5">
      <Card className="relative overflow-visible">
        <div className="flex flex-col gap-5 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              {t("Welcome,", "مرحبا،")} {admin?.name ?? t("Yehya", "يحيى")} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2 text-sm text-secondary">
              {t("Here is an overview of your activity today", "إليك نظرة عامة على نشاطك اليوم")}
            </p>
          </div>
          <div
            className={`flex flex-wrap items-center gap-3 ${
              language === "ar" ? "flex-row-reverse" : ""
            }`}
          >
            <div ref={addMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAddMenuOpen((open) => !open)}
                className="flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90"
              >
                <PlusIcon className="h-4 w-4" />
                {t("Add session", "إضافة جلسة")}
              </button>
              {addMenuOpen ? (
                <div className="absolute end-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-card p-2 shadow-2xl shadow-black/15">
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                    {t("Choose session type", "اختر نوع الجلسة")}
                  </p>
                  <div className="grid gap-1">
                    {SESSION_CATEGORIES.map((category) => (
                      <SessionCategoryOption
                        key={category}
                        category={category}
                        label={CATEGORY_LABELS[category][language]}
                        onSelect={openAddSession}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {/* Opens the live site in a new tab, matching the CMS pages'
                "Preview page" control. Was a button with no handler. */}
            <a
              href={import.meta.env.VITE_PUBLIC_SITE_URL ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center gap-2 rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary"
            >
              <EyeIcon className="h-4 w-4" />
              {t("Preview site", "معاينة الموقع")}
            </a>
            <NotificationBell />
            
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
          {/* No trend footnotes: the stats endpoint returns current totals
              only, with no historical series to compare against. */}
          <StatTile label={t("Total sessions", "إجمالي الجلسات")} value={formatNumber(data.totalSessions)} icon={CalendarIcon} />
          <StatTile label={t("Clients", "العملاء")} value={formatNumber(data.totalClients)} icon={UsersIcon} />
          <StatTile
            label={t("Total photos", "إجمالي الصور")}
            value={formatNumber(imageTotal)}
            footnote={t(
              `${formatNumber(data.totalImages)} photos · ${formatNumber(data.totalVideos)} videos`,
              `${formatNumber(data.totalImages)} صورة · ${formatNumber(data.totalVideos)} فيديو`
            )}
            icon={ImageIcon}
          />
          <StatTile label={t("Total downloads", "إجمالي التحميلات")} value={formatNumber(data.totalDownloads)} icon={DownloadIcon} />
          <StatTile
            label={t("Storage used", "مساحة التخزين")}
            value={storageUsed}
            footnote={t(
              "Live bucket total",
              "إجمالي مساحة التخزين الحالية"
            )}
            icon={DatabaseIcon}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr_1fr]">
        <Card className="p-5">
          {/*
            No "view all": this panel merges sessions, clients and downloads,
            and every candidate page shows only one of those three. A button
            leading somewhere that lists a third of what is above it is worse
            than no button.
          */}
          <PanelHeader title={t("Recent activity", "النشاط الأخير")} />
          <div className="space-y-5">
            {activities.length ? (
              activities.map((activity) => (
                <div key={activity.key} className="flex items-center gap-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activity.tone} text-primary`}>
                    <activity.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary">{activity.title}</p>
                    <p className="mt-1 truncate text-xs text-secondary">{activity.meta}</p>
                    <p className="mt-1 text-xs text-secondary/75">
                      {formatRelativeTime(activity.at, language)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary">
                {t("No activity yet.", "لا يوجد نشاط بعد.")}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-primary">
              {t("Downloads overview", "نظرة عامة على التحميلات")}
            </h2>
            <span className="rounded-md border border-line bg-base px-4 py-2 text-xs text-secondary">
              {t("Last 14 days", "آخر 14 يوم")}
            </span>
          </div>
          <div className="relative h-72 overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 top-6 bottom-10 flex flex-col justify-between text-xs text-secondary/70">
              {[1, 0.8, 0.6, 0.4, 0.2, 0].map((fraction) => (
                <div key={fraction} className="flex items-center gap-3">
                  <span className="w-8 text-start">
                    {Math.round(downloadSeries.peak * fraction)}
                  </span>
                  <span className="h-px flex-1 border-t border-dashed border-line" />
                </div>
              ))}
            </div>
            <svg className="absolute inset-x-8 bottom-10 top-6 h-[calc(100%-4rem)] w-[calc(100%-4rem)] overflow-visible" viewBox="0 0 398 170" preserveAspectRatio="none">
              <defs>
                <linearGradient id="downloadFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#c8a87d" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#c8a87d" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,170 ${downloadSeries.points} 398,170`}
                fill="url(#downloadFill)"
              />
              <polyline
                points={downloadSeries.points}
                fill="none"
                stroke="#c8a87d"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="absolute inset-x-8 bottom-0 flex justify-between text-xs text-secondary" dir="ltr">
              {downloadSeries.buckets
                .filter((_, index) => index % 3 === 0)
                .map((bucket) => (
                  <span key={bucket.date.toISOString()}>
                    {bucket.date.toLocaleDateString(language === "ar" ? "ar" : "en-US", {
                      day: "numeric",
                      month: "short"
                    })}
                  </span>
                ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <PanelHeader title={t("Latest sessions", "أحدث الجلسات")} to="/sessions" />
          <div className="space-y-5">
            {recentSessions.length ? (
              recentSessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4">
                  <SessionCover
                    session={session}
                    className="h-16 w-24 shrink-0 shadow-inner"
                    roundedClassName="rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{session.title}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {formatDate(session.eventDate, language)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {t(
                        `${session.mediaCount} files`,
                        `${session.mediaCount} ملف`
                      )}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary">
                {t("No sessions yet.", "لا توجد جلسات بعد.")}
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <PanelHeader title={t("Storage usage", "استخدام التخزين")} />
          <div className="mb-4 text-sm text-secondary">
            <span>{t(`${storageUsed} used`, `مستخدمة ${storageUsed}`)}</span>
          </div>
          <p className="text-3xl font-semibold text-primary">
            {storageUsed}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-secondary">
            {t(
              "Live total of all files currently stored in your media bucket.",
              "الإجمالي الحالي لجميع الملفات المخزنة في مساحة الوسائط."
            )}
          </p>
          {/* The API reports counts per type, not bytes per type. */}
          <div className="mt-8 space-y-3 text-sm">
            <div className="flex justify-between text-secondary">
              <span>{t("Photos", "الصور")}</span>
              <span>{formatNumber(data.totalImages)}</span>
            </div>
            <div className="flex justify-between text-secondary">
              <span>{t("Videos", "الفيديوهات")}</span>
              <span>{formatNumber(data.totalVideos)}</span>
            </div>
            <div className="flex justify-between text-secondary">
              <span>{t("Total files", "إجمالي الملفات")}</span>
              <span>{formatNumber(imageTotal)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <PanelHeader title={t("Latest clients", "أحدث العملاء")} to="/clients" />
          <div className="space-y-4">
            {recentClients.length ? (
              recentClients.map((client, index) => (
                <div key={client.id} className="flex items-center gap-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${AVATAR_TONES[index % AVATAR_TONES.length]} text-sm font-semibold text-white`}
                  >
                    {client.name.trim().slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{client.name}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {t("Registered:", "تم التسجيل:")} {formatDate(client.createdAt, language)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary">
                {t("No clients yet.", "لا يوجد عملاء بعد.")}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <PanelHeader title={t("Most downloaded sessions", "أكثر الجلسات تحميلاً")} to="/downloads" />
          <div className="space-y-5">
            {topDownloads.length ? (
              topDownloads.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${RANK_COLORS[index] ?? RANK_COLORS[3]}`}
                  >
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                    {item.title}
                  </p>
                  <span className="shrink-0 text-xs text-secondary">
                    {t(`${item.count} downloads`, `${item.count} تحميل`)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary">
                {t("No downloads yet.", "لا توجد تحميلات بعد.")}
              </p>
            )}
          </div>
        </Card>
      </div>

      {isFetching ? (
        <p className="text-xs text-secondary">{t("Updating...", "جار التحديث...")}</p>
      ) : null}
    </div>
  );
}
