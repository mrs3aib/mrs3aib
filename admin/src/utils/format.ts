export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : 1;

  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** e.g. "Jun 17, 2025" / "١٧ يونيو ٢٠٢٥" */
export function formatDate(iso: string, language: "en" | "ar"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language === "ar" ? "ar" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/**
 * Coarse "time ago" label, e.g. "10 minutes ago".
 *
 * Uses Intl.RelativeTimeFormat so both languages get correct pluralisation
 * without us hand-writing the rules.
 */
export function formatRelativeTime(iso: string, language: "en" | "ar"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60]
  ];

  const formatter = new Intl.RelativeTimeFormat(language === "ar" ? "ar" : "en", {
    numeric: "auto"
  });

  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }
  return formatter.format(Math.round(seconds), "second");
}
