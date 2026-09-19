import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { LogoLoader } from "@/components/LogoLoader";
import {
  ChartIcon,
  ClockIcon,
  EyeIcon,
  MonitorIcon,
  UsersIcon
} from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { useAnalyticsSummaryQuery } from "@/hooks/useAnalytics";
import { formatNumber, formatRelativeTime } from "@/utils/format";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/types/analytics";
import { VisitsChart } from "./analytics/VisitsChart";
import { BreakdownList } from "./analytics/BreakdownList";

const PERIOD_LABELS: Record<AnalyticsPeriod, { en: string; ar: string }> = {
  today: { en: "Today", ar: "اليوم" },
  "7d": { en: "7 days", ar: "٧ أيام" },
  "30d": { en: "30 days", ar: "٣٠ يوم" },
  "90d": { en: "90 days", ar: "٩٠ يوم" },
  "12m": { en: "12 months", ar: "١٢ شهر" }
};

const DEVICE_LABELS: Record<string, { en: string; ar: string }> = {
  desktop: { en: "Desktop", ar: "كمبيوتر" },
  mobile: { en: "Mobile", ar: "جوال" },
  tablet: { en: "Tablet", ar: "جهاز لوحي" },
  bot: { en: "Bots", ar: "روبوتات" },
  unknown: { en: "Unknown", ar: "غير معروف" }
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Change indicator for a stat tile.
 *
 * Null is rendered as a dash rather than as 0%: the API returns null when the
 * previous period had no traffic at all, and "0%" there would claim the two
 * periods were equal when one of them simply has no baseline.
 */
function TrendPill({ pct }: { pct: number | null }) {
  const { t } = useLanguage();

  if (pct === null) {
    return (
      <span className="text-xs text-secondary/70">
        {t("No prior data", "لا توجد بيانات سابقة")}
      </span>
    );
  }

  const rising = pct >= 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        rising ? "bg-[#edf4ef] text-[#2f7d4f]" : "bg-[#fbeceb] text-danger"
      }`}
      // The sign is meaningful and must not flip in an RTL layout.
      dir="ltr"
    >
      {rising ? "+" : ""}
      {pct}%
    </span>
  );
}

function StatTile({
  label,
  value,
  footnote,
  trend,
  icon: Icon
}: {
  label: string;
  value: string;
  footnote?: string;
  trend?: number | null;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-secondary">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-primary">{value}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eee9e2] text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {trend !== undefined ? <TrendPill pct={trend} /> : null}
        {footnote ? <span className="text-xs text-secondary">{footnote}</span> : null}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [includeBots, setIncludeBots] = useState(false);

  const { data, isPending, isError, error, refetch, isFetching } =
    useAnalyticsSummaryQuery({ period, includeBots });

  const deviceLabel = (label: string) =>
    DEVICE_LABELS[label] ? t(DEVICE_LABELS[label].en, DEVICE_LABELS[label].ar) : label;

  /**
   * Referrer rows with "direct" spelled out.
   *
   * The API uses a sentinel label rather than a translated string, so the
   * wording — and its Arabic form — is decided here with the rest of the UI
   * copy.
   */
  const referrerRows = useMemo(
    () =>
      (data?.referrers ?? []).map((row) => ({
        ...row,
        label: row.label === "direct" ? t("Direct / none", "مباشر") : row.label
      })),
    [data?.referrers, t]
  );

  const localeRows = useMemo(
    () =>
      (data?.locales ?? []).map((row) => ({
        ...row,
        label:
          row.label === "en"
            ? t("English", "الإنجليزية")
            : row.label === "ar"
              ? t("Arabic", "العربية")
              : t("Unknown", "غير معروف")
      })),
    [data?.locales, t]
  );

  const deviceRows = useMemo(
    () => (data?.devices ?? []).map((row) => ({ ...row, label: deviceLabel(row.label) })),
    // `deviceLabel` closes over `t`, which is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.devices, t]
  );

  if (isError) {
    return (
      <Card className="p-5">
        <p className="text-sm text-danger">
          {error instanceof Error
            ? error.message
            : t("Could not load analytics.", "تعذر تحميل التحليلات.")}
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

  const { totals, comparison } = data;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-5 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="tracking-nav text-xs font-medium uppercase text-accent">
              {t("Analytics", "التحليلات")}
            </p>
            <h1 className="tracking-title font-display mt-2 text-2xl font-semibold text-primary">
              {t("Website visitors", "زوار الموقع")}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-secondary">
              <span className="relative flex h-2 w-2">
                {/* Pulses only when someone is actually on the site, so a
                    still dot genuinely means "nobody here right now". */}
                {totals.activeNow > 0 ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2f7d4f] opacity-70" />
                ) : null}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    totals.activeNow > 0 ? "bg-[#2f7d4f]" : "bg-line"
                  }`}
                />
              </span>
              {t(
                `${formatNumber(totals.activeNow)} active in the last 5 minutes`,
                `${formatNumber(totals.activeNow)} نشط في آخر ٥ دقائق`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-base p-1">
              {ANALYTICS_PERIODS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === value
                      ? "bg-accent text-white shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {PERIOD_LABELS[value][language]}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs text-secondary">
              <input
                type="checkbox"
                checked={includeBots}
                onChange={(event) => setIncludeBots(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#c8a87d]"
              />
              {t("Include bots", "تضمين الروبوتات")}
            </label>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t("Unique visitors", "الزوار الفريدون")}
            value={formatNumber(totals.visitors)}
            trend={comparison ? comparison.visitorsChangePct : undefined}
            footnote={
              comparison
                ? t(
                    `vs ${formatNumber(comparison.visitors)}`,
                    `مقابل ${formatNumber(comparison.visitors)}`
                  )
                : undefined
            }
            icon={UsersIcon}
          />
          <StatTile
            label={t("Page views", "مشاهدات الصفحات")}
            value={formatNumber(totals.views)}
            trend={comparison ? comparison.viewsChangePct : undefined}
            footnote={
              comparison
                ? t(
                    `vs ${formatNumber(comparison.views)}`,
                    `مقابل ${formatNumber(comparison.views)}`
                  )
                : undefined
            }
            icon={EyeIcon}
          />
          <StatTile
            label={t("Pages per visitor", "صفحات لكل زائر")}
            value={totals.viewsPerVisitor.toFixed(1)}
            footnote={t("Higher means deeper browsing", "الأعلى يعني تصفحاً أعمق")}
            icon={ChartIcon}
          />
          <StatTile
            label={t("Active now", "نشط الآن")}
            value={formatNumber(totals.activeNow)}
            footnote={t("Last 5 minutes", "آخر ٥ دقائق")}
            icon={ClockIcon}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">
            {t("Visits over time", "الزيارات عبر الوقت")}
          </h2>
          <span className="rounded-md border border-line bg-base px-4 py-2 text-xs text-secondary">
            {PERIOD_LABELS[period][language]}
          </span>
        </div>
        <VisitsChart
          buckets={data.timeseries}
          granularity={data.granularity}
          language={language}
        />
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-5 text-base font-semibold text-primary">
            {t("Top pages", "أكثر الصفحات زيارة")}
          </h2>
          <BreakdownList
            rows={data.topPaths.map((row) => ({
              key: row.path,
              label: row.path,
              value: row.views,
              hint: t(
                `${formatNumber(row.visitors)} visitors`,
                `${formatNumber(row.visitors)} زائر`
              )
            }))}
            emptyLabel={t("No page views yet.", "لا توجد مشاهدات بعد.")}
            monospace
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-5 text-base font-semibold text-primary">
            {t("Most viewed albums", "أكثر الألبومات مشاهدة")}
          </h2>
          <BreakdownList
            rows={data.topSessions.map((row) => ({
              key: row.sessionId,
              label: row.title,
              value: row.views,
              hint: t(
                `${formatNumber(row.visitors)} visitors`,
                `${formatNumber(row.visitors)} زائر`
              )
            }))}
            emptyLabel={t("No album views yet.", "لا توجد مشاهدات ألبومات بعد.")}
          />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-5 text-base font-semibold text-primary">
            {t("Traffic sources", "مصادر الزيارات")}
          </h2>
          <BreakdownList
            rows={referrerRows.map((row) => ({
              key: row.label,
              label: row.label,
              value: row.views
            }))}
            emptyLabel={t("No referrers yet.", "لا توجد مصادر بعد.")}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-primary">
            <MonitorIcon className="h-4 w-4 text-secondary" />
            {t("Devices", "الأجهزة")}
          </h2>
          <BreakdownList
            rows={deviceRows.map((row) => ({
              key: row.label,
              label: row.label,
              value: row.views
            }))}
            emptyLabel={t("No data yet.", "لا توجد بيانات بعد.")}
          />
          <h3 className="mb-4 mt-6 text-sm font-semibold text-primary">
            {t("Language", "اللغة")}
          </h3>
          <BreakdownList
            rows={localeRows.map((row) => ({
              key: row.label,
              label: row.label,
              value: row.views
            }))}
            emptyLabel={t("No data yet.", "لا توجد بيانات بعد.")}
          />
        </Card>

      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">
            {t("Recent visits", "الزيارات الأخيرة")}
          </h2>
          {/* Says how many rows the scroll area holds, so a list cut off at
              the panel's edge reads as scrollable rather than as all there is. */}
          {data.recent.length ? (
            <span className="rounded-md border border-line bg-base px-3 py-1.5 text-xs text-secondary">
              {t(
                `Last ${formatNumber(data.recent.length)}`,
                `آخر ${formatNumber(data.recent.length)}`
              )}
            </span>
          ) : null}
        </div>
        {data.recent.length ? (
          /*
            Fixed height with its own scrollbar, so this panel costs the same
            vertical space whether it holds three visits or fifteen. Stacked
            full-length it pushed everything below it off the page, and the
            feed is a glance-at-it list rather than something read to the end.
          */
          <div className="max-h-80 overflow-y-auto pe-1">
            <table className="w-full text-xs">
              <tbody>
                {data.recent.map((view) => (
                  <tr
                    key={view.id}
                    className="border-b border-line/60 last:border-0"
                  >
                    {/* One line per visit. A path is an LTR token, so it is
                        marked as such to keep its segments in order in the
                        Arabic layout. */}
                    <td className="max-w-0 py-2 pe-3">
                      <span
                        className="block truncate font-mono text-primary"
                        dir="ltr"
                        title={view.path}
                      >
                        {view.path}
                      </span>
                    </td>
                    {/* Album or source, dropped first when width is tight:
                        it is the least load-bearing of the three. */}
                    <td className="hidden max-w-0 py-2 pe-3 sm:table-cell">
                      <span
                        className="block truncate text-secondary"
                        title={view.sessionTitle ?? view.referrerHost ?? undefined}
                      >
                        {view.sessionTitle ||
                          view.referrerHost ||
                          t("Direct", "مباشر")}
                      </span>
                    </td>
                    <td className="w-px whitespace-nowrap py-2 pe-3 text-secondary">
                      {deviceLabel(view.deviceType)}
                    </td>
                    <td className="w-px whitespace-nowrap py-2 text-end text-secondary/75">
                      {formatRelativeTime(view.createdAt, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-secondary">
            {t("No visits recorded yet.", "لم تُسجل أي زيارات بعد.")}
          </p>
        )}
      </Card>

      {isFetching ? (
        <p className="text-xs text-secondary">{t("Updating...", "جار التحديث...")}</p>
      ) : null}
    </div>
  );
}
