import { useQuery } from "@tanstack/react-query";
import { getDashboardStatistics } from "@/services/dashboardService";
import { queryKeys } from "@/services/queryKeys";

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: getDashboardStatistics,
    refetchInterval: 60_000
  });
}
