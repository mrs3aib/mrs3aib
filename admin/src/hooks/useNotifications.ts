import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "@/services/notificationService";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/authStore";

const STORAGE_PREFIX = "s3aib.notifications.readUntil";

/**
 * Notifications are derived server-side and carry no read state, so "seen" is
 * a single high-water mark per admin: the timestamp of the newest item that was
 * open in the panel. Anything newer counts as unread.
 */
function storageKey(adminId: string | undefined): string {
  return `${STORAGE_PREFIX}.${adminId ?? "anonymous"}`;
}

/** Lets `useSyncExternalStore` re-render when the mark changes in any tab. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readMark(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    // Private-mode browsers can throw on access; treat as "nothing read yet".
    return "";
  }
}

function writeMark(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Non-fatal: the badge simply will not persist across reloads.
  }
  for (const listener of listeners) listener();
}

export function useNotifications(limit = 20) {
  const adminId = useAuthStore((state) => state.admin?.id);
  const key = storageKey(adminId);

  const query = useQuery({
    queryKey: queryKeys.notifications.list(limit),
    queryFn: () => listNotifications(limit),
    // The feed is derived from live activity, so poll rather than cache hard.
    refetchInterval: 60_000,
    staleTime: 30_000
  });

  const readUntil = useSyncExternalStore(
    subscribe,
    () => readMark(key),
    () => ""
  );

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const unreadCount = useMemo(
    () => items.filter((item) => item.createdAt > readUntil).length,
    [items, readUntil]
  );

  /** Marks everything currently in the feed as seen. */
  const markAllRead = useCallback(() => {
    const newest = items[0]?.createdAt;
    if (newest) writeMark(key, newest);
  }, [items, key]);

  const isUnread = useCallback(
    (createdAt: string) => createdAt > readUntil,
    [readUntil]
  );

  return { ...query, items, unreadCount, markAllRead, isUnread };
}
