/** Windows the analytics page can request. Mirrors the API's own union. */
export const ANALYTICS_PERIODS = ["today", "7d", "30d", "90d", "12m"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type LabelledCount = {
  label: string;
  views: number;
};

export type AnalyticsSummary = {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  /** Bucket width of `timeseries`: hourly for today, daily otherwise. */
  granularity: "hour" | "day";
  totals: {
    views: number;
    visitors: number;
    viewsPerVisitor: number;
    /** Distinct visitors seen in the last five minutes. */
    activeNow: number;
  };
  /**
   * The preceding window of equal length. Null when that window predates any
   * data we hold — there is nothing meaningful to compare against on the first
   * days of tracking.
   */
  comparison: {
    views: number;
    visitors: number;
    /** Null when the previous window had none, where a percentage has no meaning. */
    viewsChangePct: number | null;
    visitorsChangePct: number | null;
  } | null;
  timeseries: { bucket: string; views: number; visitors: number }[];
  topPaths: { path: string; views: number; visitors: number }[];
  topSessions: {
    sessionId: string;
    title: string;
    category: string;
    views: number;
    visitors: number;
  }[];
  referrers: LabelledCount[];
  devices: LabelledCount[];
  locales: LabelledCount[];
  recent: {
    id: string;
    path: string;
    sessionTitle: string | null;
    referrerHost: string | null;
    deviceType: string;
    createdAt: string;
  }[];
};

export type AnalyticsParams = {
  period: AnalyticsPeriod;
  includeBots: boolean;
};
