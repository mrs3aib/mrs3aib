import { useLanguage } from "@/i18n/languageContext";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-secondary">
        {t(`Showing ${from}–${to} of ${total}`, `عرض ${from}–${to} من ${total}`)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="tracking-nav rounded-md border border-line px-3 py-1.5 text-xs font-medium uppercase text-secondary transition-colors hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Prev", "السابق")}
        </button>
        <span className="text-xs text-secondary">
          {t(`Page ${page} of ${totalPages}`, `صفحة ${page} من ${totalPages}`)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="tracking-nav rounded-md border border-line px-3 py-1.5 text-xs font-medium uppercase text-secondary transition-colors hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Next", "التالي")}
        </button>
      </div>
    </div>
  );
}


