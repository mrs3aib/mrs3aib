import { useLanguage } from "@/i18n/languageContext";
import type { SessionStatus } from "@/types/session";

const styles: Record<SessionStatus, string> = {
  draft: "bg-secondary/10 text-secondary",
  active: "bg-success/10 text-success",
  archived: "bg-line text-secondary"
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { t } = useLanguage();
  const labels: Record<SessionStatus, string> = {
    draft: t("Draft", "مسودة"),
    active: t("Active", "نشطة"),
    archived: t("Archived", "مؤرشفة")
  };

  return (
    <span
      className={`tracking-nav inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}


