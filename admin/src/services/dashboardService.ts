import { apiClient } from "./apiClient";
import type { DashboardStatistics } from "@/types/dashboard";

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const { data } = await apiClient.get<DashboardStatistics>("/admin/dashboard/stats");
  return data;
}
