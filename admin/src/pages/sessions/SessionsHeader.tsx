import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DatabaseIcon,
  DownloadIcon,
  ImageIcon
} from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { useLanguage } from "@/i18n/languageContext";
import { formatNumber } from "@/utils/format";
import type { SessionListResult } from "@/types/session";
import { SessionCard } from "./SessionCard";
import type { SessionIcon } from "./sessionPageUtils";

function StatCard({
  label,
  value,
  delta,
  icon: Icon
}: {
  label: string;
  value: string;
  delta: string;
  icon: SessionIcon;
}) {
  return (
    <SessionCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-secondary">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-primary">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eee9e2] text-primary">
          <Icon className="h-5 w-5 shrink-0" />
        </span>
      </div>
      <p className="mt-4 text-xs text-secondary">{delta}</p>
    </SessionCard>
  );
}

export function SessionsHeader({
  total,
  statusCounts,
  totalMedia,
  sessionCount,
  onExport
}: {
  total: number;
  statusCounts: SessionListResult["statusCounts"] | undefined;
  totalMedia: number;
  sessionCount: number;
  onExport: () => void;
}) {
  const { t } = useLanguage();

  return (
    <SessionCard className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 shrink-0 text-accent sm:h-7 sm:w-7" />
            <h1 className="truncate text-2xl font-semibold text-primary sm:text-3xl">
              {t("Sessions", "الجلسات")}
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
            {t(
              "Manage all photo sessions and appointments",
              "إدارة جميع جلسات التصوير والمواعيد"
            )}
          </p>
        </div>
        <div className="grid grid-cols-[auto] gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <NotificationBell size="lg" />
          <button
            type="button"
            onClick={onExport}
            disabled={sessionCount === 0}
            className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-[#171b24] px-4 text-sm font-medium text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#222834] disabled:opacity-50 sm:px-5"
          >
            <DownloadIcon className="h-5 w-5 shrink-0" />
            {t("Export report", "تصدير التقرير")}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          label={t("Total sessions", "إجمالي الجلسات")}
          value={formatNumber(total)}
          delta={t("Matching current filters", "حسب عوامل التصفية الحالية")}
          icon={CalendarIcon}
        />
        <StatCard
          label={t("Active sessions", "جلسات نشطة")}
          value={formatNumber(statusCounts?.active ?? 0)}
          delta={t("Visible to clients", "مرئية للعملاء")}
          icon={CheckCircleIcon}
        />
        <StatCard
          label={t("Draft sessions", "جلسات مسودة")}
          value={formatNumber(statusCounts?.draft ?? 0)}
          delta={t("Not published yet", "لم تنشر بعد")}
          icon={ClockIcon}
        />
        <StatCard
          label={t("Archived", "مؤرشفة")}
          value={formatNumber(statusCounts?.archived ?? 0)}
          delta={t("Hidden from galleries", "مخفية عن المعارض")}
          icon={DatabaseIcon}
        />
        <StatCard
          label={t("Media on this page", "الوسائط في هذه الصفحة")}
          value={formatNumber(totalMedia)}
          delta={t("Across listed sessions", "عبر الجلسات المعروضة")}
          icon={ImageIcon}
        />
      </div>
    </SessionCard>
  );
}
