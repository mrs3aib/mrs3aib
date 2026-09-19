import { useMemo, useState } from "react";
import type { AdminLanguage } from "@/i18n/languageContext";
import { useLanguage } from "@/i18n/languageContext";
import { formatNumber } from "@/utils/format";

type Bucket = { bucket: string; views: number; visitors: number };

/** Chart viewBox. Drawn in its own coordinate space and scaled by CSS. */
const WIDTH = 720;
const HEIGHT = 220;

/** Room at the bottom for the axis labels, inside the same viewBox. */
const PLOT_HEIGHT = 186;

/**
 * Tick label for one bucket.
 *
 * Hourly buckets show the hour; daily ones the day and month. Forced to a
 * 24-hour clock so a label never grows an "AM"/"PM" that would collide with
 * its neighbour at this density.
 */
function tickLabel(
  iso: string,
  granularity: "hour" | "day",
  language: AdminLanguage
): string {
  const date = new Date(iso);
  const locale = language === "ar" ? "ar" : "en-US";
  return granularity === "hour"
    ? date.toLocaleTimeString(locale, { hour: "2-digit", hour12: false })
    : date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function fullLabel(
  iso: string,
  granularity: "hour" | "day",
  language: AdminLanguage
): string {
  const date = new Date(iso);
  const locale = language === "ar" ? "ar" : "en-US";
  return granularity === "hour"
    ? date.toLocaleString(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        hour12: false
      })
    : date.toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
}

/**
 * Views and visitors over the selected period.
 *
 * Two filled lines rather than bars: the series are read for shape — when
 * traffic rose, whether visitors tracked views — and at 90 daily buckets bars
 * become too thin to read individually. Hovering any bucket reveals its exact
 * figures, which is what a bar chart's width would otherwise be buying.
 */
export function VisitsChart({
  buckets,
  granularity,
  language
}: {
  buckets: Bucket[];
  granularity: "hour" | "day";
  language: AdminLanguage;
}) {
  const { t } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    // A single bucket has no span to divide by; placing it mid-chart reads
    // better than pinning it to the left edge.
    const step = buckets.length > 1 ? WIDTH / (buckets.length - 1) : 0;
    const x = (index: number) =>
      buckets.length > 1 ? index * step : WIDTH / 2;

    // Scaled to views, the larger of the two series, so both fit one axis.
    // The floor of 1 keeps an all-zero period from dividing by zero and
    // instead draws a flat line along the baseline.
    const peak = Math.max(1, ...buckets.map((bucket) => bucket.views));
    const y = (value: number) => PLOT_HEIGHT - (value / peak) * PLOT_HEIGHT;

    const line = (pick: (bucket: Bucket) => number) =>
      buckets
        .map((bucket, index) => `${x(index).toFixed(1)},${y(pick(bucket)).toFixed(1)}`)
        .join(" ");

    const viewsLine = line((bucket) => bucket.views);

    return {
      peak,
      x,
      y,
      viewsLine,
      visitorsLine: line((bucket) => bucket.visitors),
      // Closed back along the baseline so the area beneath can be filled.
      viewsArea: `0,${PLOT_HEIGHT} ${viewsLine} ${WIDTH},${PLOT_HEIGHT}`
    };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-secondary">
        {t("No visits in this period.", "لا توجد زيارات في هذه الفترة.")}
      </p>
    );
  }

  // Roughly eight labels, whatever the bucket count — 90 daily ticks would
  // overlap into an unreadable band.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 8));
  const active = hover === null ? null : buckets[hover];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
        <span className="flex items-center gap-2">
          <span className="h-2 w-4 rounded-full bg-[#c8a87d]" />
          {t("Page views", "مشاهدات")}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-4 rounded-full bg-[#7c93a6]" />
          {t("Unique visitors", "زوار فريدون")}
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-72 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("Visits over time", "الزيارات عبر الوقت")}
        >
          <defs>
            <linearGradient id="visitsFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c8a87d" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c8a87d" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Gridlines, with the peak and midpoint labelled. */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={WIDTH}
              y1={PLOT_HEIGHT * fraction}
              y2={PLOT_HEIGHT * fraction}
              stroke="#e8e3dc"
              strokeWidth={1}
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <polygon points={chart.viewsArea} fill="url(#visitsFill)" />
          <polyline
            points={chart.viewsLine}
            fill="none"
            stroke="#c8a87d"
            strokeWidth={2.2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={chart.visitorsLine}
            fill="none"
            stroke="#7c93a6"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {active ? (
            <line
              x1={chart.x(hover!)}
              x2={chart.x(hover!)}
              y1={0}
              y2={PLOT_HEIGHT}
              stroke="#c8a87d"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {/*
            One hit area per bucket, spanning the full height so the pointer
            need only be somewhere in that column. Drawn last so it sits above
            the lines and nothing steals the hover.
          */}
          {buckets.map((bucket, index) => {
            const bandWidth = WIDTH / buckets.length;
            return (
              <rect
                key={bucket.bucket}
                x={index * bandWidth}
                y={0}
                width={bandWidth}
                height={PLOT_HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>

        {/* Peak value, so the vertical scale is readable without an axis. */}
        <span className="pointer-events-none absolute start-0 top-0 text-xs text-secondary/70">
          {formatNumber(chart.peak)}
        </span>

        {active ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
            // Positioned from the left in both directions: this tracks a point
            // in the SVG's own left-to-right coordinate space, which does not
            // mirror with the page.
            style={{ left: `${(chart.x(hover!) / WIDTH) * 100}%` }}
          >
            <p className="font-medium text-primary">
              {fullLabel(active.bucket, granularity, language)}
            </p>
            <p className="mt-1 text-secondary">
              {t(
                `${formatNumber(active.views)} views`,
                `${formatNumber(active.views)} مشاهدة`
              )}
            </p>
            <p className="text-secondary">
              {t(
                `${formatNumber(active.visitors)} visitors`,
                `${formatNumber(active.visitors)} زائر`
              )}
            </p>
          </div>
        ) : null}
      </div>

      {/* Ticks are chronological left-to-right regardless of page direction,
          matching the chart they label. */}
      <div className="flex justify-between text-xs text-secondary" dir="ltr">
        {buckets
          .filter((_, index) => index % tickEvery === 0)
          .map((bucket) => (
            <span key={bucket.bucket}>
              {tickLabel(bucket.bucket, granularity, language)}
            </span>
          ))}
      </div>
    </div>
  );
}
