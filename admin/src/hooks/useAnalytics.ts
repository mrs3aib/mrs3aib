import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "@/services/analyticsService";
import { queryKeys } from "@/services/queryKeys";
import type { AnalyticsParams } from "@/types/analytics";

export function useAnalyticsSummaryQuery(params: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(params),
    queryFn: () => getAnalyticsSummary(params),
    // The page carries a live "active now" figure and a recent-views feed,
    // both of which are stale within a minute of being drawn.
    refetchInterval: 60_000,
    // Keeps the previous period's charts on screen while a new range loads,
    // so switching from 7d to 30d redraws rather than blanking the page.
    placeholderData: (previous) => previous
  });
}
