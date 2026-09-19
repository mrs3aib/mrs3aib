import { formatNumber } from "@/utils/format";

export type BreakdownRow = {
  key: string;
  label: string;
  value: number;
  /** Secondary figure shown beneath the label, e.g. visitor count. */
  hint?: string;
};

/**
 * A ranked list with a proportional bar behind each row.
 *
 * The bar is scaled to the largest row rather than to the total, so the
 * leading item always fills the width and the rest read as a share of it.
 * Against a total, a list whose top entry holds 4% would render as ten
 * near-invisible slivers.
 */
export function BreakdownList({
  rows,
  emptyLabel,
  /** Renders labels in a monospace face — for paths, where alignment helps. */
  monospace = false
}: {
  rows: BreakdownRow[];
  emptyLabel: string;
  monospace?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-secondary">{emptyLabel}</p>;
  }

  const peak = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="relative overflow-hidden rounded-md">
          <div
            className="absolute inset-y-0 start-0 bg-[#f1ece4]"
            style={{ width: `${(row.value / peak) * 100}%` }}
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm text-primary ${
                  monospace ? "font-mono text-xs" : ""
                }`}
                // Paths and host names are LTR tokens: in an RTL layout an
                // unmarked "/en/category/weddings" renders with its segments
                // reordered.
                dir={monospace ? "ltr" : undefined}
                title={row.label}
              >
                {row.label}
              </p>
              {row.hint ? (
                <p className="mt-0.5 truncate text-xs text-secondary">{row.hint}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-sm font-medium text-primary">
              {formatNumber(row.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
