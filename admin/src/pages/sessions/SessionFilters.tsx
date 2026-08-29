import { CloseIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { CATEGORY_LABELS, SESSION_CATEGORIES, type SessionCategory } from "@/types/category";
import type { SessionSort, SessionStatus } from "@/types/session";

export function SessionFilters({
  searchInput,
  status,
  category,
  sort,
  hasFilters,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onSortChange,
  onCreate,
  onReset,
  onClearSearch
}: {
  searchInput: string;
  status: SessionStatus | "";
  category: SessionCategory | "";
  sort: SessionSort;
  hasFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: SessionStatus | "") => void;
  onCategoryChange: (value: SessionCategory | "") => void;
  onSortChange: (value: SessionSort) => void;
  onCreate: () => void;
  onReset: () => void;
  onClearSearch: () => void;
}) {
  const { t, language } = useLanguage();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onCreate}
        className="flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <PlusIcon className="h-4 w-4 shrink-0" />
        {t("New session", "جلسة جديدة")}
      </button>

      <select
        value={category}
        onChange={(event) => onCategoryChange(event.target.value as SessionCategory | "")}
        aria-label={t("Session type", "نوع الجلسة")}
        className="h-12 w-44 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <option value="">{t("All types", "كل الأنواع")}</option>
        {SESSION_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {CATEGORY_LABELS[value][language]}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as SessionStatus | "")}
        aria-label={t("Status", "الحالة")}
        className="h-12 w-40 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <option value="">{t("All statuses", "كل الحالات")}</option>
        <option value="active">{t("Active", "نشطة")}</option>
        <option value="draft">{t("Draft", "مسودة")}</option>
        <option value="archived">{t("Archived", "مؤرشفة")}</option>
      </select>

      <select
        value={sort}
        onChange={(event) => onSortChange(event.target.value as SessionSort)}
        aria-label={t("Sort", "الترتيب")}
        className="h-12 w-44 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <option value="newest">{t("Newest first", "الأحدث أولاً")}</option>
        <option value="oldest">{t("Oldest first", "الأقدم أولاً")}</option>
        <option value="eventDate">{t("Event date", "تاريخ المناسبة")}</option>
        <option value="title">{t("Title (A-Z)", "العنوان (أ-ي)")}</option>
        <option value="mediaCount">{t("Most media", "الأكثر وسائط")}</option>
      </select>

      <label className="flex h-12 min-w-56 flex-1 items-center gap-3 overflow-hidden rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
        <input
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-secondary/60"
          placeholder={t("Search by title or location...", "ابحث بالعنوان أو الموقع...")}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={onClearSearch}
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
          onClick={onReset}
          className="flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <CloseIcon className="h-4 w-4" />
          {t("Clear filters", "مسح عوامل التصفية")}
        </button>
      ) : null}
    </div>
  );
}
