import { Router } from "express";
import { mediaController } from "@/controllers/mediaController";
import { validate } from "@/middleware/validate";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  addYouTubeLinkSchema,
  listMediaSchema,
  mediaIdParamSchema,
  requestUploadUrlSchema
} from "@/validations/mediaValidations";

export const adminMediaRouter = Router();

adminMediaRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/media:
 *   get:
 *     tags: [Admin Media]
 *     summary: List media, optionally scoped to one session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         description: Omit to list media across every session
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [image, video] }
 *       - in: query
 *         name: search
 *         description: Matches original file name or session title
 *         schema: { type: string }
 *       - in: query
 *         name: processingStatus
 *         schema: { type: string, enum: [processing, ready, failed] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest, largest, smallest, name] }
 *     responses:
 *       200: { description: Paginated media plus totalSize/imageCount/videoCount }
 */
adminMediaRouter.get("/", validate(listMediaSchema), asyncHandler(mediaController.list));

/**
 * @openapi
 * /admin/media/upload-url:
 *   post:
 *     tags: [Admin Media]
 *     summary: Request a signed URL to upload a file directly to storage
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Signed upload URL and pending media id }
 */
adminMediaRouter.post(
  "/upload-url",
  validate(requestUploadUrlSchema),
  asyncHandler(mediaController.requestUploadUrl)
);

/**
 * @openapi
 * /admin/media/youtube:
 *   post:
 *     tags: [Admin Media]
 *     summary: Attach a YouTube video to a session as a link (no file is stored)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The created media record }
 *       400: { description: Not a valid YouTube link, or already in the session }
 */
adminMediaRouter.post(
  "/youtube",
  validate(addYouTubeLinkSchema),
  asyncHandler(mediaController.addYouTubeLink)
);

/**
 * @openapi
 * /admin/media/{id}/confirm:
 *   post:
 *     tags: [Admin Media]
 *     summary: Confirm a direct upload finished; triggers processing (thumbnail/optimized version/metadata)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Processed media record }
 */
adminMediaRouter.post(
  "/:id/confirm",
  validate(mediaIdParamSchema),
  asyncHandler(mediaController.confirmUpload)
);

/**
 * @openapi
 * /admin/media/{id}:
 *   delete:
 *     tags: [Admin Media]
 *     summary: Delete a media item and its derivatives
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
adminMediaRouter.delete(
  "/:id",
  validate(mediaIdParamSchema),
  asyncHandler(mediaController.delete)
);
