import type { ReactNode } from "react";
import { useLanguage } from "@/i18n/languageContext";

type RepeaterProps<T> = {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  /** Builds a blank entry when the admin adds a row. */
  createItem: () => T;
  /** Renders the fields for one entry. */
  renderItem: (item: T, index: number, update: (next: T) => void) => ReactNode;
  addLabel?: string;
  /** Shown in place of the list while empty, so the section explains itself. */
  emptyHint?: string;
  /** Beyond this, adding is disabled — used where the layout is fixed. */
  maxItems?: number;
};

/**
 * Add / remove / reorder editor for a list of content entries.
 *
 * The site falls back to its built-in copy whenever a section's list is empty,
 * so removing every row is a legitimate way to say "use the defaults" rather
 * than an error state.
 */
export function Repeater<T>({
  label,
  items,
  onChange,
  createItem,
  renderItem,
  addLabel,
  emptyHint,
  maxItems
}: RepeaterProps<T>) {
  const { t } = useLanguage();

  const update = (index: number, next: T) => {
    onChange(items.map((item, i) => (i === index ? next : item)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved as T);
    onChange(next);
  };

  const atLimit = maxItems !== undefined && items.length >= maxItems;

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="tracking-nav text-xs font-medium uppercase text-secondary">
          {label}
        </span>
        <span className="text-xs text-secondary">
          {items.length}
          {maxItems !== undefined ? ` / ${maxItems}` : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mb-3 text-sm text-secondary">
          {emptyHint ??
            t(
              "No entries yet — the site will use its default content.",
              "لا توجد عناصر بعد — سيستخدم الموقع المحتوى الافتراضي."
            )}
        </p>
      ) : (
        <ul className="mb-3 grid gap-3">
          {items.map((item, index) => (
            <li key={index} className="rounded border border-line p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-secondary">#{index + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${label} ${index + 1} up`}
                    className="px-1 text-xs text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${label} ${index + 1} down`}
                    className="px-1 text-xs text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-xs font-medium uppercase text-danger underline underline-offset-2"
                  >
                    {t("Remove", "إزالة")}
                  </button>
                </div>
              </div>
              {renderItem(item, index, (next) => update(index, next))}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...items, createItem()])}
        disabled={atLimit}
        className="text-xs font-medium uppercase text-primary underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {atLimit
          ? t(`Maximum ${maxItems} reached`, `تم الوصول إلى الحد الأقصى (${maxItems})`)
          : (addLabel ?? t("Add item", "إضافة عنصر"))}
      </button>
    </div>
  );
}
