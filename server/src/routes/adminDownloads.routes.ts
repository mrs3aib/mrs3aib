import { Router } from "express";
import { downloadHistoryController } from "@/controllers/downloadHistoryController";
import { validate } from "@/middleware/validate";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { listDownloadsSchema } from "@/validations/downloadValidations";

export const adminDownloadsRouter = Router();

adminDownloadsRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/downloads:
 *   get:
 *     tags: [Admin Downloads]
 *     summary: View download history, filtered and paginated
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         description: Matches session title, client name, or IP address
 *         schema: { type: string }
 *       - in: query
 *         name: downloadType
 *         schema: { type: string, enum: [single, multiple, zip] }
 *       - in: query
 *         name: from
 *         description: Inclusive lower bound on the download timestamp
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         description: Inclusive upper bound on the download timestamp
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, mostFiles, fewestFiles, session, client]
 *       - in: query
 *         name: activityDays
 *         description: Width of the returned activity series, in days
 *         schema: { type: integer, minimum: 1, maximum: 365 }
 *     responses:
 *       200:
 *         description: Paginated history plus stats, activity series and topSessions
 */
adminDownloadsRouter.get(
  "/",
  validate(listDownloadsSchema),
  asyncHandler(downloadHistoryController.list)
);
