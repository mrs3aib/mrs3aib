import { Router } from "express";
import { notificationController } from "@/controllers/notificationController";
import { validate } from "@/middleware/validate";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { listNotificationsSchema } from "@/validations/notificationValidations";

export const adminNotificationsRouter = Router();

adminNotificationsRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/notifications:
 *   get:
 *     tags: [Admin Notifications]
 *     summary: Recent activity feed, derived from downloads, uploads and clients
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200: { description: Newest-first notification items }
 */
adminNotificationsRouter.get(
  "/",
  validate(listNotificationsSchema),
  asyncHandler(notificationController.list)
);
