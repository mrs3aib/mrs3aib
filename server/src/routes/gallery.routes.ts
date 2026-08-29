import { Router } from "express";
import { galleryController } from "@/controllers/galleryController";
import { requireAuth, requireClient } from "@/middleware/auth";
import { requireOwnSession } from "@/middleware/clientScope";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { sessionIdParamSchema } from "@/validations/downloadClientValidations";

export const galleryRouter = Router();

galleryRouter.use(requireAuth, requireClient);

/**
 * @openapi
 * /gallery:
 *   get:
 *     tags: [Gallery]
 *     summary: Get the authenticated client's own gallery
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Gallery contents }
 */
galleryRouter.get("/", asyncHandler(galleryController.getOwn));

/**
 * @openapi
 * /gallery/{sessionId}:
 *   get:
 *     tags: [Gallery]
 *     summary: Get a gallery by session id (must match the client's own session)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Gallery contents }
 *       403: { description: Not authorized for this gallery }
 */
galleryRouter.get(
  "/:sessionId",
  validate(sessionIdParamSchema),
  requireOwnSession("sessionId"),
  asyncHandler(galleryController.getBySessionId)
);
