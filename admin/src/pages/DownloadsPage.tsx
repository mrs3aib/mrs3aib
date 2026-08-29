import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  FolderIcon,
  ImageIcon,
  MoreHorizontalIcon,
  SearchIcon,
  UsersIcon
} from "@/components/icons";
import { FancyDateRangePicker } from "@/components/FancyDatePicker";
import { NotificationBell } from "@/components/NotificationBell";
import { LogoLoader } from "@/components/LogoLoader";
import { Modal } from "@/components/Modal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDownloadsQuery } from "@/hooks/useDownloads";
import { useSessionsQuery } from "@/hooks/useSessions";
import { useClientsQuery } from "@/hooks/useClients";
import { useLanguage } from "@/i18n/languageContext";
import { formatDate, formatNumber } from "@/utils/format";
import type {
  DownloadRecord,
  DownloadSort,
  DownloadTopSession,
  DownloadType
} from "@/types/download";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const ACTIVITY_DAY_OPTIONS = [7, 30, 90];

type Icon = ComponentType<{ className?: string }>;

/** Columns the server can order by, mapped to their asc/desc sort keys. */
const SORT_COLUMNS = {
  sessionTitle: { asc: "session", desc: "session" },
  clientName: { asc: "client", desc: "client" },
  mediaCount: { asc: "fewestFiles", desc: "mostFiles" },
  timestamp: { asc: "oldest", desc: "newest" }
} as const satisfies Record<string, { asc: DownloadSort; desc: DownloadSort }>;

type SortColumn = keyof typeof SORT_COLUMNS;
type SortDirection = "asc" | "desc";

/** Deterministic gradient per id, so a row's thumbnail stays stable across renders. */
const TONES = [
  "from-[#2a1d19] to-[#d4a664]",
  "from-[#d2a36e] to-[#20242d]",
  "from-[#14171b] to-[#b68a57]",
  "from-[#493528] to-[#d1aa74]",
  "from-[#1d211c] to-[#8b6b44]",
  "from-[#d7b08a] to-[#28303b]",
  "from-[#d8a878] to-[#20242b]"
];

function toneFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return TONES[hash % TONES.length] as string;
}

function formatTime(iso: string, language: "en" | "ar"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(language === "ar" ? "ar" : "en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
  icon: Icon
}: {
  label: string;
  value: string;
  delta: string;
  icon: Icon;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-secondary">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-primary">{value}</p>
        </div>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#f1ebe4] text-[#a36d20]">
          <Icon className="h-7 w-7" />
        </span>
      </div>
      <p className="mt-4 text-xs text-secondary">{delta}</p>
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  wide = false,
  children
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={`h-12 shrink-0 truncate rounded-lg border border-line bg-card px-4 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40 ${wide ? "w-60" : "w-44"}`}
    >
      {children}
    </select>
  );
}

function Thumb({ tone }: { tone: string }) {
  return (
    <div className={`h-12 w-20 shrink-0 rounded-md bg-gradient-to-br ${tone}`}>
      <div className="h-full rounded-md bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.38),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent)]" />
    </div>
  );
}

/**
 * Most-downloaded sessions.
 *
 * Redesigned as a ranked bar chart: each row's fill is its share of the top
 * session's file count, so relative volume is readable at a glance instead of
 * having to compare numbers. The leader is highlighted; the rest are muted.
 */
function TopSessionsWidget({
  sessions,
  onSelect
}: {
  sessions: DownloadTopSession[];
  onSelect: (sessionId: string) => void;
}) {
  const { t } = useLanguage();
  const peak = Math.max(...sessions.map((session) => session.files), 1);
  const totalFiles = sessions.reduce((sum, session) => sum + session.files, 0);

  const MEDALS = [
    "bg-[#f2c14e] text-white",
    "bg-[#c9ccd2] text-white",
    "bg-[#d8a552] text-white"
  ];

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-primary">
            {t("Most downloaded sessions", "الجلسات الأكثر تحميلاً")}
          </h2>
          <p className="mt-1 text-xs text-secondary">
            {t("Ranked by files downloaded", "مرتبة حسب الملفات المحملة")}
          </p>
        </div>
        {totalFiles > 0 ? (
          <span className="shrink-0 rounded-md bg-base px-2.5 py-1 text-[11px] font-medium text-secondary">
            {t(`${formatNumber(totalFiles)} files`, `${formatNumber(totalFiles)} ملف`)}
          </span>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <p className="text-sm text-secondary">
            {t("No download data yet.", "لا توجد بيانات تحميل بعد.")}
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {sessions.map((session, index) => {
            const width = Math.max((session.files / peak) * 100, 2);
            const share =
              totalFiles === 0 ? 0 : Math.round((session.files / totalFiles) * 100);
            const leader = index === 0;

            return (
              <li key={session.sessionId}>
                <button
                  type="button"
                  onClick={() => onSelect(session.sessionId)}
                  title={t("Filter by this session", "تصفية حسب هذه الجلسة")}
                  className="group w-full rounded-lg border border-transparent p-2 text-start transition-colors hover:border-line hover:bg-base/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        MEDALS[index] ?? "bg-line text-secondary"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <p
                      className={`min-w-0 flex-1 truncate text-sm ${leader ? "font-semibold text-primary" : "font-medium text-primary/90"}`}
                      title={session.sessionTitle}
                    >
                      {session.sessionTitle}
                    </p>

                    <span className="shrink-0 font-display text-sm font-semibold text-primary">
                      {formatNumber(session.files)}
                    </span>
                  </div>

                  {/* Bar length = share of the leader, so rank is visual. */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-base">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          leader ? "bg-accent" : "bg-accent/45 group-hover:bg-accent/70"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-end text-[11px] text-secondary">
                      {share}% ·{" "}
                      {t(
                        `${formatNumber(session.downloads)} dl`,
                        `${formatNumber(session.downloads)} تحميل`
                      )}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export default function DownloadsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0] as number);
  const [sessionId, setSessionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [downloadType, setDownloadType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "timestamp",
    direction: "desc"
  });
  const [activityDays, setActivityDays] = useState(ACTIVITY_DAY_OPTIONS[1] as number);
  const [detail, setDetail] = useState<DownloadRecord | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const sortKey = SORT_COLUMNS[sort.column][sort.direction];

  // Everything below is resolved server-side: filters, sorting, pagination and
  // the aggregates behind the stat cards, chart and top-sessions widget.
  const { data, isPending, isError, refetch } = useDownloadsQuery({
    page,
    pageSize,
    sort: sortKey,
    activityDays,
    ...(search ? { search } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(downloadType ? { downloadType: downloadType as DownloadType } : {}),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {})
  });

  const { data: sessionsData } = useSessionsQuery({ page: 1, pageSize: 100 });
  const { data: clientsData } = useClientsQuery({ page: 1, pageSize: 100 });

  const records = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const stats = data?.stats;

  // Any filter change invalidates the current page offset.
  useEffect(() => {
    setPage(1);
  }, [sessionId, clientId, downloadType, fromDate, toDate, search, pageSize, sortKey]);

  const typeLabel = (type: DownloadType) =>
    type === "zip"
      ? t("Full download (ZIP)", "تنزيل كامل (ZIP)")
      : type === "multiple"
        ? t("Selected gallery", "معرض مختار")
        : t("Single file", "ملف مفرد");

  const typeStyle = (type: DownloadType) =>
    type === "zip"
      ? "bg-success/10 text-success"
      : type === "multiple"
        ? "bg-[#fff3df] text-[#b87223]"
        : "bg-[#eaf3ff] text-[#437fce]";

  const hasFilters = Boolean(
    sessionId || clientId || downloadType || fromDate || toDate || searchInput
  );

  const resetFilters = () => {
    setSessionId("");
    setClientId("");
    setDownloadType("");
    setFromDate("");
    setToDate("");
    setSearchInput("");
  };

  const toggleSort = (column: SortColumn) =>
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
        : {
            column,
            direction: column === "timestamp" || column === "mediaCount" ? "desc" : "asc"
          }
    );

  /** Exports the rows currently on screen. */
  const exportCsv = () => {
    const header = [
      "ID",
      "Session",
      "Client",
      "Files",
      "Type",
      "IP address",
      "Timestamp"
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...records.map((record) =>
        [
          record.id,
          record.sessionTitle,
          record.clientName,
          String(record.mediaCount),
          record.downloadType,
          record.ipAddress,
          record.timestamp
        ]
          .map(escape)
          .join(",")
      )
    ];

    // Prefixed with a BOM so Excel reads the Arabic session titles as UTF-8.
    const blob = new Blob([`﻿${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `downloads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pageNumbers = useMemo(() => {
    const windowSize = 3;
    const start = Math.max(Math.min(page - 1, totalPages - windowSize + 1), 1);
    return Array.from(
      { length: Math.min(windowSize, totalPages) },
      (_, index) => start + index
    );
  }, [page, totalPages]);

  /** Chart geometry derived from the server's per-day activity series. */
  const chart = useMemo(() => {
    const series = data?.activity ?? [];
    if (series.length === 0) return null;

    const peak = Math.max(...series.map((point) => point.downloads), 1);
    const step = series.length > 1 ? 552 / (series.length - 1) : 552;
    const points = series
      .map(
        (point, index) =>
          `${(index * step).toFixed(1)},${(140 - (point.downloads / peak) * 128).toFixed(1)}`
      )
      .join(" ");

    const busiest = series.reduce(
      (best, point) => (point.downloads > best.downloads ? point : best),
      series[0]!
    );
    const labelStep = Math.max(Math.floor(series.length / 6), 1);

    return {
      peak,
      points,
      busiest,
      labels: series.filter((_, index) => index % labelStep === 0)
    };
  }, [data]);

  return (
    <div className="space-y-5" onClick={() => setMenuFor(null)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <DownloadIcon className="h-8 w-8 text-[#8b5b19]" />
            <h1 className="text-3xl font-semibold text-primary">
              {t("Downloads", "التحميلات")}
            </h1>
          </div>
          <p className="mt-2 text-sm text-secondary">
            {t(
              "Manage and track every download and photo share",
              "إدارة وتتبع جميع عمليات التحميل ومشاركة الصور"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={import.meta.env.VITE_PUBLIC_SITE_URL ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <EyeIcon className="h-5 w-5" />
            {t("Preview site", "معاينة الموقع")}
          </a>
          <NotificationBell />
          <button
            type="button"
            onClick={exportCsv}
            disabled={records.length === 0}
            className="flex h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-lg bg-[#171b24] px-5 text-sm font-medium text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#222834] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            {t("Export CSV", "تصدير CSV")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t("Total downloads", "إجمالي التحميل")}
          value={formatNumber(stats?.totalDownloads ?? 0)}
          delta={t("Matching current filters", "حسب عوامل التصفية الحالية")}
          icon={DownloadIcon}
        />
        <StatCard
          label={t("Unique downloaders", "إجمالي المحمّلين")}
          value={formatNumber(stats?.uniqueClients ?? 0)}
          delta={t("Distinct clients", "عملاء مختلفون")}
          icon={UsersIcon}
        />
        <StatCard
          label={t("Files downloaded", "إجمالي الملفات المحملة")}
          value={formatNumber(stats?.totalFiles ?? 0)}
          delta={t("Across all records", "عبر جميع السجلات")}
          icon={FolderIcon}
        />
        <StatCard
          label={t("Sessions downloaded", "جلسات تم تحميلها")}
          value={formatNumber(stats?.uniqueSessions ?? 0)}
          delta={t("Distinct sessions", "جلسات مختلفة")}
          icon={ImageIcon}
        />
        <StatCard
          label={t("Avg. per session", "متوسط التحميل لكل جلسة")}
          value={t(
            `${stats?.averageFilesPerSession ?? 0} files`,
            `${stats?.averageFilesPerSession ?? 0} ملف`
          )}
          delta={t("Files per session", "ملف لكل جلسة")}
          icon={ClockIcon}
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            value={clientId}
            onChange={setClientId}
            label={t("Client", "العميل")}
          >
            <option value="">{t("All clients", "كل العملاء")}</option>
            {clientsData?.items.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={downloadType}
            onChange={setDownloadType}
            label={t("Download type", "نوع التحميل")}
          >
            <option value="">{t("All types", "كل الأنواع")}</option>
            <option value="zip">{t("Full download (ZIP)", "تنزيل كامل (ZIP)")}</option>
            <option value="multiple">{t("Selected gallery", "معرض مختار")}</option>
            <option value="single">{t("Single file", "ملف مفرد")}</option>
          </FilterSelect>

          <FilterSelect
            value={sessionId}
            onChange={setSessionId}
            label={t("Session", "الجلسة")}
          >
            <option value="">{t("All sessions", "كل الجلسات")}</option>
            {sessionsData?.items.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </FilterSelect>

          <FancyDateRangePicker
            from={fromDate}
            to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            fromLabel={t("From date", "من تاريخ")}
            toLabel={t("To date", "إلى تاريخ")}
          />

          <label className="flex h-12 min-w-56 flex-1 items-center gap-3 rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
            <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-secondary/60"
              placeholder={t(
                "Search by session, client, or IP...",
                "ابحث باسم الجلسة أو العميل أو IP..."
              )}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label={t("Clear search", "مسح البحث")}
                className="shrink-0 text-secondary transition-colors hover:text-primary"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          {hasFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <CloseIcon className="h-4 w-4" />
              {t("Clear filters", "مسح عوامل التصفية")}
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isError ? (
          <div className="p-5">
            <p className="text-sm text-danger">
              {t("Could not load download history.", "تعذر تحميل سجل التحميلات.")}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
            >
              {t("Try again", "حاول مرة أخرى")}
            </button>
          </div>
        ) : isPending ? (
          <div className="flex min-h-80 items-center justify-center">
            <LogoLoader />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-card text-secondary">
                    <Th column="sessionTitle" sort={sort} onSort={toggleSort}>
                      {t("Session name", "اسم الجلسة")}
                    </Th>
                    <Th column="clientName" sort={sort} onSort={toggleSort}>
                      {t("Client", "العميل")}
                    </Th>
                    <Th column="mediaCount" sort={sort} onSort={toggleSort}>
                      {t("Files", "عدد الملفات")}
                    </Th>
                    <Th column="timestamp" sort={sort} onSort={toggleSort}>
                      {t("Date", "التاريخ")}
                    </Th>
                    <Th>{t("Download type", "نوع التحميل")}</Th>
                    <Th>{t("IP address", "عنوان IP")}</Th>
                    <Th>{t("Actions", "العملية")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-sm text-secondary"
                      >
                        {hasFilters
                          ? t(
                              "No downloads match these filters.",
                              "لا توجد تحميلات تطابق عوامل التصفية."
                            )
                          : t("No downloads recorded yet.", "لا توجد تحميلات مسجلة بعد.")}
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-line last:border-0 hover:bg-base/65"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Thumb tone={toneFor(record.sessionId)} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-primary">
                                {record.sessionTitle}
                              </p>
                              <p
                                className="mt-1 truncate text-xs text-secondary"
                                dir="ltr"
                              >
                                #{record.id.slice(0, 8).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-primary">{record.clientName}</td>
                        <td className="px-5 py-3 text-primary">
                          {formatNumber(record.mediaCount)}
                        </td>
                        <td className="px-5 py-3 text-primary">
                          <span className="block">
                            {formatDate(record.timestamp, language)}
                          </span>
                          <span className="mt-1 block text-xs text-secondary">
                            {formatTime(record.timestamp, language)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex justify-center rounded-full px-3 py-1.5 text-xs font-medium ${typeStyle(record.downloadType)}`}
                          >
                            {typeLabel(record.downloadType)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-secondary" dir="ltr">
                          {record.ipAddress}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setDetail(record)}
                              aria-label={t("View details", "عرض التفاصيل")}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f0e9] text-[#8b5b19] transition-colors hover:bg-[#eee2d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/uploads?sessionId=${record.sessionId}`)
                              }
                              aria-label={t("Open session", "فتح الجلسة")}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f0e9] text-[#8b5b19] transition-colors hover:bg-[#eee2d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                              <FolderIcon className="h-4 w-4" />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setMenuFor((current) =>
                                    current === record.id ? null : record.id
                                  );
                                }}
                                aria-label={t("More actions", "إجراءات أخرى")}
                                aria-expanded={menuFor === record.id}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f0e9] text-[#8b5b19] transition-colors hover:bg-[#eee2d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                              >
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </button>
                              {menuFor === record.id ? (
                                <div
                                  className="absolute end-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-xl"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <MenuItem
                                    onClick={() => {
                                      setSessionId(record.sessionId);
                                      setMenuFor(null);
                                    }}
                                  >
                                    {t("Filter by this session", "تصفية حسب هذه الجلسة")}
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      setClientId(record.clientId);
                                      setMenuFor(null);
                                    }}
                                  >
                                    {t("Filter by this client", "تصفية حسب هذا العميل")}
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      void navigator.clipboard.writeText(record.id);
                                      setMenuFor(null);
                                    }}
                                  >
                                    {t("Copy record ID", "نسخ رقم السجل")}
                                  </MenuItem>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <label className="flex items-center gap-2 text-sm text-secondary">
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-primary outline-none transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {t("per page", "لكل صفحة")}
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-primary transition-colors hover:bg-base disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("Previous page", "الصفحة السابقة")}
                >
                  <ChevronDownIcon className="h-4 w-4 rotate-90" />
                </button>
                {pageNumbers.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-current={page === item ? "page" : undefined}
                    className={`h-10 w-10 rounded-lg text-sm transition-colors ${page === item ? "bg-accent text-white" : "text-primary hover:bg-base"}`}
                  >
                    {item}
                  </button>
                ))}
                {totalPages > (pageNumbers.at(-1) ?? 0) ? (
                  <>
                    <span className="px-2 text-secondary">...</span>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      className="h-10 w-10 shrink-0 rounded-lg text-sm text-primary transition-colors hover:bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      {totalPages}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-primary transition-colors hover:bg-base disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("Next page", "الصفحة التالية")}
                >
                  <ChevronDownIcon className="h-4 w-4 -rotate-90" />
                </button>
              </div>

              <p className="text-sm text-secondary">
                {total === 0
                  ? t("No results", "لا نتائج")
                  : t(
                      `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`,
                      `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} من ${total}`
                    )}
              </p>
            </div>
          </>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-primary">
                {t("Download activity", "نشاط التحميل")}
              </h2>
              <p className="mt-1 text-xs text-secondary">
                {t(
                  `Downloads over the last ${activityDays} days`,
                  `عدد التحميلات خلال آخر ${activityDays} يوم`
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={records.length === 0}
                className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
              >
                <DownloadIcon className="h-4 w-4 shrink-0" />
                {t("Export", "تصدير")}
              </button>
              <select
                value={activityDays}
                onChange={(event) => setActivityDays(Number(event.target.value))}
                aria-label={t("Chart range", "نطاق الرسم")}
                className="h-10 shrink-0 rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {ACTIVITY_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {t(`${days} days`, `${days} يوم`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="relative h-56 overflow-hidden">
            <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between text-xs text-secondary/70">
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                <div key={ratio} className="flex items-center gap-3">
                  <span className="w-8 text-start">
                    {Math.round((chart?.peak ?? 0) * ratio)}
                  </span>
                  <span className="h-px flex-1 border-t border-dashed border-line" />
                </div>
              ))}
            </div>
            {chart ? (
              <>
                <svg
                  className="absolute inset-x-8 bottom-8 top-4 h-[calc(100%-3rem)] w-[calc(100%-4rem)] overflow-visible"
                  viewBox="0 0 552 140"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="downloadActivityFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#c8a87d" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#c8a87d" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,140 ${chart.points} 552,140`}
                    fill="url(#downloadActivityFill)"
                  />
                  <polyline
                    points={chart.points}
                    fill="none"
                    stroke="#c8a87d"
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {chart.busiest.downloads > 0 ? (
                  <div className="absolute end-4 top-2 rounded-md border border-line bg-card px-5 py-3 text-center text-sm shadow-xl">
                    <p className="font-semibold text-primary">
                      {chart.busiest.downloads}
                    </p>
                    <p className="mt-1 text-secondary">
                      {t("peak downloads", "ذروة التحميلات")}
                    </p>
                    <p className="text-xs text-secondary">
                      {formatDate(chart.busiest.date, language)}
                    </p>
                  </div>
                ) : null}
                <div className="absolute inset-x-8 bottom-0 flex justify-between text-xs text-secondary">
                  {chart.labels.map((point) => (
                    <span key={point.date}>{formatDate(point.date, language)}</span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Card>

        <TopSessionsWidget sessions={data?.topSessions ?? []} onSelect={setSessionId} />
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={t("Download details", "تفاصيل التحميل")}
      >
        {detail ? (
          <dl className="space-y-3 text-sm">
            <DetailRow label={t("Session", "الجلسة")} value={detail.sessionTitle} />
            <DetailRow label={t("Client", "العميل")} value={detail.clientName} />
            <DetailRow
              label={t("Files", "عدد الملفات")}
              value={formatNumber(detail.mediaCount)}
            />
            <DetailRow
              label={t("Download type", "نوع التحميل")}
              value={typeLabel(detail.downloadType)}
            />
            <DetailRow label={t("IP address", "عنوان IP")} value={detail.ipAddress} ltr />
            <DetailRow
              label={t("Date", "التاريخ")}
              value={`${formatDate(detail.timestamp, language)} — ${formatTime(detail.timestamp, language)}`}
            />
            <DetailRow label={t("Record ID", "رقم السجل")} value={detail.id} ltr />
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailRow({
  label,
  value,
  ltr = false
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0">
      <dt className="shrink-0 text-secondary">{label}</dt>
      <dd
        className="min-w-0 break-words text-end font-medium text-primary"
        {...(ltr ? { dir: "ltr" } : {})}
      >
        {value}
      </dd>
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-4 py-2 text-start text-sm text-primary transition-colors hover:bg-base"
    >
      {children}
    </button>
  );
}

function Th({
  children,
  column,
  sort,
  onSort
}: {
  children: ReactNode;
  column?: SortColumn;
  sort?: { column: SortColumn; direction: SortDirection };
  onSort?: (column: SortColumn) => void;
}) {
  if (!column || !onSort || !sort) {
    return (
      <th className="px-5 py-4 text-start text-xs font-medium text-secondary">
        {children}
      </th>
    );
  }

  const active = sort.column === column;
  return (
    <th className="px-5 py-4 text-start text-xs font-medium text-secondary">
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-sort={
          active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
        }
        className={`inline-flex items-center gap-1 transition-colors hover:text-primary ${active ? "text-primary" : ""}`}
      >
        {children}
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform ${active && sort.direction === "asc" ? "rotate-180" : ""} ${active ? "opacity-100" : "opacity-40"}`}
        />
      </button>
    </th>
  );
}
