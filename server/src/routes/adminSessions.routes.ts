import { Router } from "express";
import multer from "multer";
import { sessionController } from "@/controllers/sessionController";
import { gallerySettingsController } from "@/controllers/gallerySettingsController";
import { validate } from "@/middleware/validate";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  assignClientsSchema,
  createSessionSchema,
  listSessionsSchema,
  sessionCoverParamSchema,
  sessionIdParamSchema,
  setSessionCoverUrlSchema,
  updateSessionSchema
} from "@/validations/sessionValidations";
import {
  gallerySettingsParamSchema,
  updateGallerySettingsSchema
} from "@/validations/gallerySettingsValidations";

export const adminSessionsRouter = Router();

/**
 * A session cover is a single still shown on gallery cards, so it is capped far
 * below the album media limit and accepts images only.
 */
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed for a session cover"));
  }
});

adminSessionsRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/sessions:
 *   get:
 *     tags: [Admin Sessions]
 *     summary: List sessions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, active, archived] }
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *   post:
 *     tags: [Admin Sessions]
 *     summary: Create a session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Created session
 */
adminSessionsRouter
  .route("/")
  .get(validate(listSessionsSchema), asyncHandler(sessionController.list))
  .post(validate(createSessionSchema), asyncHandler(sessionController.create));

/**
 * @openapi
 * /admin/sessions/{id}:
 *   get:
 *     tags: [Admin Sessions]
 *     summary: Get a session by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Session }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Admin Sessions]
 *     summary: Update a session (including status/archive)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated session }
 *   delete:
 *     tags: [Admin Sessions]
 *     summary: Delete a session and all its media
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
adminSessionsRouter
  .route("/:id")
  .get(validate(sessionIdParamSchema), asyncHandler(sessionController.getById))
  .patch(validate(updateSessionSchema), asyncHandler(sessionController.update))
  .delete(validate(sessionIdParamSchema), asyncHandler(sessionController.delete));

/**
 * @openapi
 * /admin/sessions/{sessionId}/clients:
 *   post:
 *     tags: [Admin Sessions]
 *     summary: Assign existing clients to this session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Clients assigned }
 */
adminSessionsRouter.post(
  "/:sessionId/clients",
  validate(assignClientsSchema),
  asyncHandler(sessionController.assignClients)
);

/**
 * @openapi
 * /admin/sessions/{sessionId}/settings:
 *   get:
 *     tags: [Admin Sessions]
 *     summary: Get gallery settings for a session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Gallery settings }
 *   patch:
 *     tags: [Admin Sessions]
 *     summary: Update gallery settings for a session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated gallery settings }
 */
/**
 * @openapi
 * /admin/sessions/{sessionId}/cover:
 *   post:
 *     tags: [Admin Sessions]
 *     summary: Upload a cover image for this session's gallery cards
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated session }
 *   put:
 *     tags: [Admin Sessions]
 *     summary: Point the cover at an externally hosted image
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated session }
 *   delete:
 *     tags: [Admin Sessions]
 *     summary: Remove the session's own cover, reverting to the pinned or automatic one
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated session }
 */
adminSessionsRouter
  .route("/:sessionId/cover")
  .post(
    validate(sessionCoverParamSchema),
    coverUpload.single("file"),
    asyncHandler(sessionController.uploadCover)
  )
  .put(
    validate(setSessionCoverUrlSchema),
    asyncHandler(sessionController.setCoverUrl)
  )
  .delete(
    validate(sessionCoverParamSchema),
    asyncHandler(sessionController.removeCover)
  );

adminSessionsRouter
  .route("/:sessionId/settings")
  .get(validate(gallerySettingsParamSchema), asyncHandler(gallerySettingsController.get))
  .patch(
    validate(updateGallerySettingsSchema),
    asyncHandler(gallerySettingsController.update)
  );
