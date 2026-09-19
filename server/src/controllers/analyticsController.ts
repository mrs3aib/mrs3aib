import type { Request, Response } from "express";
import { env } from "@/config/env";
import {
  analyticsService,
  trackVisitSafely,
  type AnalyticsPeriod
} from "@/services/analyticsService";
import { getClientIp } from "@/utils/requestIp";

/**
 * Hostnames that count as our own.
 *
 * Derived from the configured CORS origins rather than kept as a second list:
 * those are already exactly the sites allowed to call this API, so the two can
 * never drift apart. A referral from one of them is internal navigation, not a
 * traffic source.
 */
const SELF_HOSTS = env.CORS_ORIGINS.map((origin) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}).filter((host): host is string => host !== null);

export const analyticsController = {
  /**
   * Record a page view from the public site.
   *
   * Answers 202 immediately and does not wait for the write. The caller is a
   * `sendBeacon` during page load with nothing to do with the response, so
   * holding the connection open for a database round-trip would add latency to
   * a visitor's page for no one's benefit.
   */
  track(req: Request, res: Response): void {
    const { path, referrer, sessionId } = req.body as {
      path: string;
      referrer?: string;
      sessionId?: string;
    };

    void trackVisitSafely({
      path,
      referrer,
      sessionId,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
      selfHosts: SELF_HOSTS
    });

    res.status(202).end();
  },

  async getSummary(req: Request, res: Response): Promise<void> {
    const { period, includeBots } = req.query as {
      period?: AnalyticsPeriod;
      includeBots?: boolean;
    };

    const summary = await analyticsService.getSummary(period ?? "30d", {
      includeBots: includeBots ?? false
    });
    res.status(200).json(summary);
  }
};
