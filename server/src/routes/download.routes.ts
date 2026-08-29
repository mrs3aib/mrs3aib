import { Router } from "express";
import { clientDownloadController } from "@/controllers/clientDownloadController";
import { requireAuth, requireClient } from "@/middleware/auth";
import { requireOwnSession } from "@/middleware/clientScope";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  downloadMultipleSchema,
  downloadSelectionSchema,
  mediaIdParamSchema,
  sessionIdParamSchema
} from "@/validations/downloadClientValidations";

export const downloadRouter = Router();

downloadRouter.use(requireAuth, requireClient);

/**
 * @openapi
 * /download/{mediaId}:
 *   get:
 *     tags: [Download]
 *     summary: Get a signed download URL for a single media item
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Signed download URL }
 */
downloadRouter.get(
  "/:mediaId",
  validate(mediaIdParamSchema),
  asyncHandler(clientDownloadController.downloadSingle)
);

/**
 * @openapi
 * /download/multiple:
 *   post:
 *     tags: [Download]
 *     summary: Get signed download URLs for multiple selected media items
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaIds]
 *             properties:
 *               mediaIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Signed download URLs }
 */
downloadRouter.post(
  "/multiple",
  validate(downloadMultipleSchema),
  asyncHandler(clientDownloadController.downloadMultiple)
);

/**
 * @openapi
 * /download/session/{sessionId}/selection:
 *   post:
 *     tags: [Download]
 *     summary: Download the selected media as a single ZIP archive
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaIds]
 *             properties:
 *               mediaIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Signed ZIP download URL }
 */
downloadRouter.post(
  "/session/:sessionId/selection",
  validate(downloadSelectionSchema),
  requireOwnSession("sessionId"),
  asyncHandler(clientDownloadController.downloadSelection)
);

/**
 * @openapi
 * /download/session/{sessionId}:
 *   post:
 *     tags: [Download]
 *     summary: Download the entire session as a ZIP archive (reused if unchanged)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Signed ZIP download URL }
 */
downloadRouter.post(
  "/session/:sessionId",
  validate(sessionIdParamSchema),
  requireOwnSession("sessionId"),
  asyncHandler(clientDownloadController.downloadSession)
);
