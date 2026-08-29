import { apiClient } from "./apiClient";
import type { NotificationFeed } from "@/types/notification";

export async function listNotifications(limit?: number): Promise<NotificationFeed> {
  const { data } = await apiClient.get<NotificationFeed>("/admin/notifications", {
    params: limit ? { limit } : {}
  });
  return data;
}
