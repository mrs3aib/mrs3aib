import { prisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import {
  analyticsRepository,
  type AnalyticsRange,
  type LabelledCount
} from "@/repositories/analyticsRepository";
import {
  classifyDevice,
  parsePath,
  parseReferrerHost,
  visitorHash
} from "@/utils/visitorFingerprint";

/** Windows the analytics page offers. */
export type AnalyticsPeriod = "today" | "7d" | "30d" | "90d" | "12m";

/**
 * How recently a visitor must have been seen to count as "active now".
 *
 * Five minutes is the convention every analytics tool uses, and it matches how
 * the beacon behaves: one view is recorded per page, so a visitor reading a
 * long gallery sends nothing further. A shorter window would report them as
 * gone while they are still on the page.
 */
const ACTIVE_WINDOW_MINUTES = 5;

const TOP_PATHS_LIMIT = 10;
const TOP_SESSIONS_LIMIT = 8;
const REFERRERS_LIMIT = 8;
const RECENT_LIMIT = 15;

export type TrackVisitInput = {
  path: string;
  referrer?: string | undefined;
  /** Session id when the page is an album, taken from the route params. */
  sessionId?: string | undefined;
  ip: string;
  userAgent?: string | undefined;
  /** Hosts that count as our own, so internal navigation is not a referral. */
  selfHosts: string[];
};

export type AnalyticsSummaryDto = {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  granularity: "hour" | "day";
  totals: {
    views: number;
    visitors: number;
    /** Views per visitor, rounded to one decimal. */
    viewsPerVisitor: number;
    activeNow: number;
  };
  /**
   * The same totals for the equally long window immediately before this one,
   * with the percentage change. Null when the previous window predates any
   * data we hold, where a "+100%" against an empty period would be noise.
   */
  comparison: {
    views: number;
    visitors: number;
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

/**
 * Start of the window, and the bucket width to chart it at.
 *
 * "Today" is the current UTC day rather than the last 24 hours: an admin
 * checking the dashboard at 9am means today, and a rolling window would fold
 * in most of yesterday. The rest are rolling, which is what "last 30 days"
 * means.
 */
function resolveRange(period: AnalyticsPeriod, now: Date): {
  from: Date;
  to: Date;
  granularity: "hour" | "day";
} {
  const to = now;

  if (period === "today") {
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    return { from, to, granularity: "hour" };
  }

  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from, to, granularity: "day" };
}

/** Percentage change, or null when the baseline is zero. */
function changePct(current: number, previous: number): number | null {
  // Growth from nothing has no defined percentage. Reporting "+100%" for a
  // first-ever visit, or "+0%" for none, both read as facts about traffic
  // rather than about an absent baseline.
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const analyticsService = {
  /**
   * Record one page view.
   *
   * Everything identifying is reduced at this boundary: the IP becomes part of
   * a daily salted hash and is not stored, the user agent becomes a device
   * bucket, and the referrer becomes a bare host. Nothing that could identify
   * a visitor reaches the table.
   */
  async trackVisit(input: TrackVisitInput): Promise<void> {
    const now = new Date();
    const { path, locale } = parsePath(input.path);

    // A session id arrives from the public album route, which is already
    // anonymous — but it is still client-supplied, so it is confirmed against
    // a published session before being stored. Otherwise anyone could inflate
    // the view count of any album, including unpublished ones.
    let sessionId: string | null = null;
    if (input.sessionId) {
      const session = await prisma.photoSession.findFirst({
        where: { id: input.sessionId, isPublic: true },
        select: { id: true }
      });
      sessionId = session?.id ?? null;
    }

    await analyticsRepository.create({
      path,
      locale,
      sessionId,
      referrerHost: parseReferrerHost(input.referrer, input.selfHosts),
      deviceType: classifyDevice(input.userAgent),
      visitorHash: visitorHash(input.ip, input.userAgent, now)
    });
  },

  async getSummary(
    period: AnalyticsPeriod,
    options: { includeBots: boolean } = { includeBots: false }
  ): Promise<AnalyticsSummaryDto> {
    const now = new Date();
    const { from, to, granularity } = resolveRange(period, now);
    const excludeBots = !options.includeBots;
    const range: AnalyticsRange = { from, to, excludeBots };

    // The window of the same length ending where this one begins.
    const previousRange: AnalyticsRange = {
      from: new Date(from.getTime() - (to.getTime() - from.getTime())),
      to: from,
      excludeBots
    };

    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_MINUTES * 60_000);

    const [
      views,
      visitors,
      activeNow,
      timeseries,
      topPaths,
      topSessions,
      referrers,
      devices,
      locales,
      recent,
      previousViews,
      previousVisitors,
      earliest
    ] = await Promise.all([
      analyticsRepository.countViews(range),
      analyticsRepository.countVisitors(range),
      analyticsRepository.countVisitorsSince(activeSince, excludeBots),
      analyticsRepository.timeseries(range, granularity),
      analyticsRepository.topPaths(range, TOP_PATHS_LIMIT),
      analyticsRepository.topSessions(range, TOP_SESSIONS_LIMIT),
      analyticsRepository.referrers(range, REFERRERS_LIMIT),
      analyticsRepository.devices(range),
      analyticsRepository.locales(range),
      analyticsRepository.recent(RECENT_LIMIT, excludeBots),
      analyticsRepository.countViews(previousRange),
      analyticsRepository.countVisitors(previousRange),
      prisma.pageView.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true }
      })
    ]);

    // Suppress the comparison when the previous window starts before we held
    // any data at all: against a period that could not have had traffic, every
    // figure reads as explosive growth on the first week of tracking.
    const hasBaseline =
      earliest !== null && earliest.createdAt.getTime() <= previousRange.from.getTime();

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      granularity,
      totals: {
        views,
        visitors,
        viewsPerVisitor: visitors === 0 ? 0 : Math.round((views / visitors) * 10) / 10,
        activeNow
      },
      comparison: hasBaseline
        ? {
            views: previousViews,
            visitors: previousVisitors,
            viewsChangePct: changePct(views, previousViews),
            visitorsChangePct: changePct(visitors, previousVisitors)
          }
        : null,
      timeseries: timeseries.map((bucket) => ({
        bucket: bucket.bucket.toISOString(),
        views: bucket.views,
        visitors: bucket.visitors
      })),
      topPaths,
      topSessions,
      referrers,
      devices,
      locales,
      recent: recent.map((view) => ({
        id: view.id,
        path: view.path,
        sessionTitle: view.session?.title ?? null,
        referrerHost: view.referrerHost,
        deviceType: view.deviceType,
        createdAt: view.createdAt.toISOString()
      }))
    };
  }
};

/**
 * Record a visit without letting a tracking failure reach the visitor.
 *
 * The beacon is fired from the public site on every page load. Analytics is
 * the least important thing happening on that request, so a write that fails —
 * a dropped database connection, a full disk — must not surface as an error on
 * a page that otherwise rendered perfectly. Logged, not silent: tracking that
 * quietly stops working looks exactly like a site nobody visits.
 */
export async function trackVisitSafely(input: TrackVisitInput): Promise<void> {
  try {
    await analyticsService.trackVisit(input);
  } catch (err) {
    logger.error({ err, path: input.path }, "Analytics: failed to record page view");
  }
}
