import { Router } from "express";
import { publicGalleryController } from "@/controllers/publicGalleryController";
import { authRateLimiter, publicArchiveRateLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  categoryParamSchema,
  publicGalleryUnlockSchema,
  publicMediaParamSchema,
  publicSelectionDownloadSchema,
  publicSessionListQuerySchema,
  publicSessionParamSchema
} from "@/validations/publicGalleryValidations";

/**
 * Anonymous, read-only gallery access for the marketing site. Every handler
 * serves only sessions flagged `isPublic`, so nothing here widens access to
 * private client galleries — those stay behind `/gallery` and `/download`.
 */
export const publicGalleryRouter = Router();

/**
 * @openapi
 * /public/categories/{category}/albums:
 *   get:
 *     tags: [Public]
 *     summary: List published sessions in a category
 *     responses:
 *       200: { description: Album summaries }
 */
publicGalleryRouter.get(
  "/categories/:category/albums",
  validate(categoryParamSchema),
  asyncHandler(publicGalleryController.listByCategory)
);

/**
 * @openapi
 * /public/sessions:
 *   get:
 *     tags: [Public]
 *     summary: List published sessions across every category
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Restrict to one category. Omit for the whole portfolio.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 60 }
 *     responses:
 *       200: { description: Album summaries }
 */
// Registered before `/sessions/:sessionId` — otherwise the param route would
// match "sessions" itself and this would never be reached.
publicGalleryRouter.get(
  "/sessions",
  validate(publicSessionListQuerySchema),
  asyncHandler(publicGalleryController.listSessions)
);

/**
 * @openapi
 * /public/sessions/{sessionId}/access:
 *   get:
 *     tags: [Public]
 *     summary: Whether this album needs a password
 *     responses:
 *       200: { description: Title and whether a password is required }
 *       404: { description: Not found or not published }
 */
// Registered before `/sessions/:sessionId` so "access" is not swallowed as a
// media path segment.
publicGalleryRouter.get(
  "/sessions/:sessionId/access",
  validate(publicSessionParamSchema),
  asyncHandler(publicGalleryController.getGalleryAccess)
);

/**
 * @openapi
 * /public/sessions/{sessionId}/unlock:
 *   post:
 *     tags: [Public]
 *     summary: Open a password-protected album
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200: { description: Gallery contents }
 *       401: { description: Wrong or missing password }
 */
// Rate limited with the auth budget: this is a password check, so it carries
// the same brute-force surface as a login.
publicGalleryRouter.post(
  "/sessions/:sessionId/unlock",
  authRateLimiter,
  validate(publicGalleryUnlockSchema),
  asyncHandler(publicGalleryController.unlockGallery)
);

/**
 * @openapi
 * /public/sessions/{sessionId}:
 *   get:
 *     tags: [Public]
 *     summary: Get a published session's media
 *     responses:
 *       200: { description: Gallery contents }
 *       404: { description: Not found or not published }
 */
publicGalleryRouter.get(
  "/sessions/:sessionId",
  validate(publicSessionParamSchema),
  asyncHandler(publicGalleryController.getGallery)
);

/**
 * @openapi
 * /public/sessions/{sessionId}/media/{mediaId}/download:
 *   get:
 *     tags: [Public]
 *     summary: Signed download URL for one original file
 *     responses:
 *       200: { description: Signed download URL }
 */
publicGalleryRouter.get(
  "/sessions/:sessionId/media/:mediaId/download",
  validate(publicMediaParamSchema),
  asyncHandler(publicGalleryController.downloadSingle)
);

/**
 * @openapi
 * /public/sessions/{sessionId}/download:
 *   post:
 *     tags: [Public]
 *     summary: Download the whole folder as one ZIP
 *     responses:
 *       200: { description: Signed ZIP download URL }
 */
publicGalleryRouter.post(
  "/sessions/:sessionId/download",
  publicArchiveRateLimiter,
  validate(publicSessionParamSchema),
  asyncHandler(publicGalleryController.downloadFolder)
);

/**
 * @openapi
 * /public/sessions/{sessionId}/download/selection:
 *   post:
 *     tags: [Public]
 *     summary: Download a chosen subset of the folder as one ZIP
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
publicGalleryRouter.post(
  "/sessions/:sessionId/download/selection",
  publicArchiveRateLimiter,
  validate(publicSelectionDownloadSchema),
  asyncHandler(publicGalleryController.downloadSelection)
);
