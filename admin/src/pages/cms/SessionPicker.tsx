import { useMemo, useState } from "react";
import { SelectField } from "@/components/SelectField";
import { CheckIcon } from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { usePublicSessionsQuery } from "@/hooks/usePublicSessions";
import type { PublicSessionSummary } from "@/services/publicSessionService";

/**
 * Pick published sessions for a homepage section.
 *
 * Selection is stored as an ordered list of session ids rather than copied
 * image URLs, so the site always renders each session's current cover and
 * title. Copying the URL would freeze whatever the cover happened to be on the
 * day it was picked, and would rot the moment a signed thumbnail URL expired.
 *
 * `lockedCategory` restricts the offered set to one category — how the Latest
 * Weddings picker stays wedding-only, while the general gallery picker browses all.
 */
export function SessionPicker({
  selected,
  onChange,
  lockedCategory,
  max
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  lockedCategory?: string;
  /** Optional ceiling on how many may be selected. */
  max?: number;
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<string>(lockedCategory ?? "");
  const activeCategory = lockedCategory ?? (filter || undefined);
  const { data: sessions, isPending, isError, refetch } =
    usePublicSessionsQuery(activeCategory);

  // Every category present in the published portfolio, for the filter dropdown.
  // Derived from the data rather than a hard-coded list so a category added in
  // the CMS shows up here without a second edit.
  const { data: allSessions } = usePublicSessionsQuery(lockedCategory);
  const categories = useMemo(
    () => [...new Set((allSessions ?? []).map((s) => s.category))].sort(),
    [allSessions]
  );

  const byId = useMemo(
    () => new Map((allSessions ?? []).map((s) => [s.id, s])),
    [allSessions]
  );

  const atLimit = max !== undefined && selected.length >= max;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
      return;
    }
    if (atLimit) return;
    onChange([...selected, id]);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved as string);
    onChange(next);
  };

  if (isError) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
        <p className="text-sm text-danger">
          {t("Could not load published sessions.", "تعذر تحميل الجلسات المنشورة.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-xs font-medium uppercase text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="tracking-nav text-xs font-medium uppercase text-secondary">
          {t("Selected", "المحدد")} ({selected.length}
          {max !== undefined ? ` / ${max}` : ""})
        </span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium uppercase text-danger underline underline-offset-2"
          >
            {t("Clear all", "مسح الكل")}
          </button>
        ) : null}
      </div>

      {/* Chosen items first, in render order, so reordering is where the eye
          already is rather than buried under the full library. */}
      {selected.length > 0 ? (
        <ol className="mb-4 grid gap-2">
          {selected.map((id, index) => {
            const session = byId.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded border border-line bg-base/60 p-2"
              >
                <span className="w-5 shrink-0 text-center text-xs text-secondary">
                  {index + 1}
                </span>

                {session?.coverUrl ? (
                  <img
                    src={session.coverUrl}
                    alt=""
                    loading="lazy"
                    className="h-10 w-14 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="h-10 w-14 shrink-0 rounded bg-line" />
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-primary">
                    {session?.title ??
                      t("Unavailable session", "جلسة غير متاحة")}
                  </span>
                  <span className="block truncate text-xs text-secondary">
                    {session
                      ? session.location
                      : t(
                          "No longer published — it will be skipped on the site.",
                          "لم تعد منشورة — سيتم تخطيها في الموقع."
                        )}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t("Move up", "تحريك لأعلى")}
                    className="rounded border border-line px-2 py-1 text-xs text-primary disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === selected.length - 1}
                    aria-label={t("Move down", "تحريك لأسفل")}
                    className="rounded border border-line px-2 py-1 text-xs text-primary disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={t("Remove", "إزالة")}
                    className="rounded border border-line px-2 py-1 text-xs text-danger"
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mb-4 text-sm text-secondary">
          {t(
            "Nothing selected yet — pick from the published sessions below.",
            "لم يتم تحديد شيء بعد — اختر من الجلسات المنشورة أدناه."
          )}
        </p>
      )}

      {!lockedCategory && categories.length > 1 ? (
        <div className="mb-3">
          <SelectField
            label={t("Filter by category", "تصفية حسب التصنيف")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{t("All categories", "كل التصنيفات")}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="block h-28 animate-pulse rounded bg-line" />
          ))}
        </div>
      ) : sessions?.length ? (
        <ul className="grid max-h-96 gap-3 overflow-y-auto sm:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selected.includes(session.id)}
              // A full selection must still allow deselecting what is already in.
              isDisabled={atLimit && !selected.includes(session.id)}
              onToggle={() => toggle(session.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-secondary">
          {t(
            "No published sessions found. Publish a session to select it here.",
            "لا توجد جلسات منشورة. انشر جلسة لتتمكن من اختيارها هنا."
          )}
        </p>
      )}
    </div>
  );
}

function SessionCard({
  session,
  isSelected,
  isDisabled,
  onToggle
}: {
  session: PublicSessionSummary;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={isDisabled}
        aria-pressed={isSelected}
        className={`w-full overflow-hidden rounded border text-start transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isSelected ? "border-accent" : "border-line hover:border-accent/50"
        }`}
      >
        <span className="relative flex h-24 items-center justify-center bg-base">
          {session.coverUrl ? (
            <img
              src={session.coverUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-secondary">
              {session.photoCount + session.videoCount} items
            </span>
          )}

          {isSelected ? (
            <span className="absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </span>

        <span className="block p-2">
          <span className="block truncate text-xs font-medium text-primary">
            {session.title}
          </span>
          <span className="block truncate text-[11px] text-secondary">
            {new Date(session.eventDate).toLocaleDateString()} · {session.category}
          </span>
        </span>
      </button>
    </li>
  );
}
