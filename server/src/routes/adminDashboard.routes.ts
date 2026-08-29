import { Router } from "express";
import { dashboardController } from "@/controllers/dashboardController";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";

export const adminDashboardRouter = Router();

adminDashboardRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/dashboard/stats:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Get dashboard statistics
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Aggregate statistics }
 */
adminDashboardRouter.get("/stats", asyncHandler(dashboardController.getStatistics));
