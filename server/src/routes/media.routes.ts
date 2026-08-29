import { Router } from "express";
import { clientMediaController } from "@/controllers/clientMediaController";
import { requireAuth, requireClient } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { z } from "zod";

export const mediaRouter = Router();

mediaRouter.use(requireAuth, requireClient);

const mediaIdParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

/**
 * @openapi
 * /media/{id}:
 *   get:
 *     tags: [Gallery]
 *     summary: Get a signed preview URL for a media item in the client's own gallery
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Signed URL }
 *       404: { description: Not found }
 */
mediaRouter.get(
  "/:id",
  validate(mediaIdParamSchema),
  asyncHandler(clientMediaController.getPreviewUrl)
);
