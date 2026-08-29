import type { SessionCategory } from "@prisma/client";

/**
 * Gallery categories a session can belong to.
 *
 * Mirrors the `SessionCategory` enum in schema.prisma and `categories` in
 * web/lib/data.ts. All three must stay in sync; the `satisfies` check below
 * fails the build if this list drifts from the Prisma enum.
 */
export const SESSION_CATEGORIES = [
  "weddings",
  "companies",
  "restaurants",
  "events",
  "products",
  "realEstate",
  "drone",
  "cinematicVideo"
] as const satisfies readonly SessionCategory[];

export type SessionCategoryId = (typeof SESSION_CATEGORIES)[number];
