import { apiClient } from "./apiClient";
import type { AnalyticsParams, AnalyticsSummary } from "@/types/analytics";

export async function getAnalyticsSummary(
  params: AnalyticsParams
): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get<AnalyticsSummary>("/admin/analytics/summary", {
    params: {
      period: params.period,
      // Sent as a string: the API reads this from the query string, where a
      // boolean would arrive as "true"/"false" anyway and only "true" enables
      // it. Being explicit keeps the two ends reading the same value.
      includeBots: params.includeBots ? "true" : "false"
    }
  });
  return data;
}
