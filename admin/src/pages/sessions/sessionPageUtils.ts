import type { ComponentType } from "react";
import { CATEGORY_LABELS, type SessionCategory } from "@/types/category";
import type {
  PhotoSession,
  SessionStatus,
  SessionVisibility
} from "@/types/session";

export const PAGE_SIZE_OPTIONS = [6, 12, 24] as const;

export type SessionIcon = ComponentType<{ className?: string }>;

export type SessionSummaryRow = {
  value: number | undefined;
  label: string;
  status: SessionStatus | "";
};

export type CategoryBreakdownItem = [SessionCategory, number];

const TONES = [
  "from-[#dac5a1] to-[#1e2732]",
  "from-[#d7a878] to-[#20242b]",
  "from-[#223145] to-[#c79d78]",
  "from-[#191b1e] to-[#d6c0a0]",
  "from-[#e3c4b0] to-[#28303b]",
  "from-[#d8b75f] to-[#203044]"
] as const;

/** Deterministic gradient per id, so a row's avatar stays stable across renders. */
export function toneFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return TONES[hash % TONES.length] as string;
}

export const STATUS_STYLES: Record<SessionStatus, { pill: string; dot: string }> = {
  active: { pill: "bg-success/10 text-success border-success/15", dot: "bg-success" },
  draft: { pill: "bg-[#eaf3ff] text-[#437fce] border-[#cfe3fb]", dot: "bg-[#8ab9ef]" },
  archived: { pill: "bg-[#f1f1f2] text-secondary border-line", dot: "bg-secondary/45" }
};

/**
 * Chip colours for the visibility column, in the same literal-hex idiom as
 * `STATUS_STYLES` — the theme carries no neutral or yellow token.
 *
 * Public keeps the success green it already had; private is a light gray
 * (unlisted, nothing to flag); protected is a light yellow, reading as
 * "listed, but gated".
 */
export const VISIBILITY_STYLES: Record<SessionVisibility, string> = {
  public: "bg-success/10 text-success border-success/15 hover:bg-success/15",
  private: "bg-[#f1f1f2] text-secondary border-line hover:bg-[#e9e9eb]",
  protected: "bg-[#fdf4dc] text-[#8a6a1a] border-[#f3e2b4] hover:bg-[#fbeecb]"
};

export function pageWindow(currentPage: number, totalPages: number): number[] {
  const windowSize = 5;
  const start = Math.max(Math.min(currentPage - 2, totalPages - windowSize + 1), 1);
  return Array.from({ length: Math.min(windowSize, totalPages) }, (_, index) => start + index);
}

export function categoryBreakdown(sessions: PhotoSession[]): CategoryBreakdownItem[] {
  const counts = new Map<SessionCategory, number>();
  for (const session of sessions) {
    counts.set(session.category, (counts.get(session.category) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

export function exportSessionsCsv(sessions: PhotoSession[]) {
  const header = ["ID", "Title", "Category", "Event date", "Location", "Status", "Public", "Clients", "Media"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...sessions.map((session) =>
      [
        session.id,
        session.title,
        CATEGORY_LABELS[session.category].en,
        session.eventDate.slice(0, 10),
        session.location,
        session.status,
        session.isPublic ? "yes" : "no",
        String(session.clientCount),
        String(session.mediaCount)
      ]
        .map(escape)
        .join(",")
    )
  ];

  // Prefixed with a BOM so Excel reads Arabic titles as UTF-8.
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
