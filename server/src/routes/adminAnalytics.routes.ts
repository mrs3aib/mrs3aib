import { Router } from "express";
import { analyticsController } from "@/controllers/analyticsController";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { analyticsSummarySchema } from "@/validations/analyticsValidations";

export const adminAnalyticsRouter = Router();

adminAnalyticsRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/analytics/summary:
 *   get:
 *     tags: [Admin Analytics]
 *     summary: Visitor analytics for a period
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d, 90d, 12m] }
 *         description: Defaults to 30d.
 *       - in: query
 *         name: includeBots
 *         schema: { type: string, enum: ["true", "false"] }
 *         description: Count recognised crawlers. Excluded by default.
 *     responses:
 *       200: { description: Totals, time series and breakdowns }
 */
adminAnalyticsRouter.get(
  "/summary",
  validate(analyticsSummarySchema),
  asyncHandler(analyticsController.getSummary)
);
