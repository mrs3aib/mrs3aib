import { createHash } from "node:crypto";
import type { Media } from "@prisma/client";

// Deterministic fingerprint of a session's media set: changes whenever
// media is added, removed, or replaced, so a cached ZIP can be safely
// reused only while this hash is unchanged.
export function mediaSetContentHash(media: Pick<Media, "id" | "size">[]): string {
  const sorted = [...media].sort((a, b) => a.id.localeCompare(b.id));
  const fingerprint = sorted.map((m) => `${m.id}:${m.size}`).join("|");
  return createHash("sha256").update(fingerprint).digest("hex").slice(0, 16);
}
