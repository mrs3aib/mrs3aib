import { useLanguage } from "@/i18n/languageContext";
import { CATEGORY_LABELS, type SessionCategory } from "@/types/category";
import type { PhotoSession, SessionStatus } from "@/types/session";
import { formatDate, formatNumber } from "@/utils/format";
import { SessionCard } from "./SessionCard";
import { SessionCover } from "./SessionCover";
import type { CategoryBreakdownItem, SessionSummaryRow } from "./sessionPageUtils";

export function SessionsSidebar({
  summaryRows,
  activeStatus,
  categoryBreakdown,
  sessions,
  onStatusChange,
  onCategoryChange,
  onEdit,
  onReset
}: {
  summaryRows: SessionSummaryRow[];
  activeStatus: SessionStatus | "";
  categoryBreakdown: CategoryBreakdownItem[];
  sessions: PhotoSession[];
  onStatusChange: (status: SessionStatus | "") => void;
  onCategoryChange: (category: SessionCategory) => void;
  onEdit: (session: PhotoSession) => void;
  onReset: () => void;
}) {
  const { t, language } = useLanguage();

  return (
    <aside className="min-w-0 space-y-4">
      <SessionCard className="p-5">
        <h2 className="mb-4 text-base font-semibold text-primary">{t("Quick summary", "ملخص سريع")}</h2>
        {summaryRows.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onStatusChange(item.status)}
            className={`flex w-full items-center justify-between border-b border-line py-2 text-sm transition-colors last:border-0 hover:text-primary ${
              activeStatus === item.status ? "font-medium text-primary" : ""
            }`}
          >
            <span className="text-secondary">{item.label}</span>
            <span className="font-semibold text-primary">
              {item.value === undefined ? "-" : formatNumber(item.value)}
            </span>
          </button>
        ))}
      </SessionCard>

      <SessionCard className="p-5">
        <h2 className="mb-4 text-base font-semibold text-primary">
          {t("Top session types", "أكثر أنواع الجلسات")}
        </h2>
        {categoryBreakdown.length === 0 ? (
          <p className="py-4 text-center text-sm text-secondary">
            {t("No data yet.", "لا توجد بيانات بعد.")}
          </p>
        ) : (
          <div className="space-y-2">
            {categoryBreakdown.map(([value, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => onCategoryChange(value)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-md py-1.5 text-xs transition-colors hover:bg-base"
              >
                <span className="truncate text-start text-secondary">
                  {CATEGORY_LABELS[value][language]}
                </span>
                <span className="font-semibold text-primary">{count}</span>
              </button>
            ))}
          </div>
        )}
      </SessionCard>

      <SessionCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">{t("Latest sessions", "أحدث الجلسات")}</h2>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-line bg-base px-3 py-1.5 text-xs text-secondary transition-colors hover:text-primary"
          >
            {t("View all", "عرض الكل")}
          </button>
        </div>
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-center text-sm text-secondary">{t("Nothing to show.", "لا يوجد ما يعرض.")}</p>
          ) : (
            sessions.slice(0, 3).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onEdit(session)}
                className="flex w-full min-w-0 items-center gap-3 rounded-md text-start transition-colors hover:bg-base"
              >
                <SessionCover
                  session={session}
                  className="h-14 w-16 shrink-0"
                  roundedClassName="rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{session.title}</p>
                  <p className="mt-1 text-xs text-secondary">{formatDate(session.eventDate, language)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </SessionCard>
    </aside>
  );
}
