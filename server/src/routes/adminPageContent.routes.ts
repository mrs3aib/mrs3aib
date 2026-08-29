import { Router } from "express";
import multer from "multer";
import { pageContentController } from "@/controllers/pageContentController";
import { requireAdmin, requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  deletePageAssetSchema,
  pageContentParamSchema,
  updatePageContentSchema
} from "@/validations/pageContentValidations";

export const adminPageContentRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      ["video/mp4", "video/webm", "video/ogg"].includes(file.mimetype)
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Only images, MP4, WebM, and Ogg videos are allowed"));
  }
});

adminPageContentRouter.use(requireAuth, requireAdmin);

adminPageContentRouter.get("/", asyncHandler(pageContentController.list));
adminPageContentRouter.get(
  "/:pageKey",
  validate(pageContentParamSchema),
  asyncHandler(pageContentController.get)
);
adminPageContentRouter.put(
  "/:pageKey",
  validate(updatePageContentSchema),
  asyncHandler(pageContentController.update)
);
adminPageContentRouter.post(
  "/:pageKey/assets",
  validate(pageContentParamSchema),
  upload.single("file"),
  asyncHandler(pageContentController.uploadAsset)
);
adminPageContentRouter.get(
  "/:pageKey/assets",
  validate(pageContentParamSchema),
  asyncHandler(pageContentController.listAssets)
);
adminPageContentRouter.delete(
  "/:pageKey/assets",
  validate(deletePageAssetSchema),
  asyncHandler(pageContentController.deleteAsset)
);
