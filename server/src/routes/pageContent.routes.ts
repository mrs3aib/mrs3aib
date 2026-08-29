import { Router } from "express";
import { pageContentController } from "@/controllers/pageContentController";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { pageContentParamSchema } from "@/validations/pageContentValidations";

export const pageContentRouter = Router();

pageContentRouter.get("/assets/*", asyncHandler(pageContentController.downloadAsset));

pageContentRouter.get(
  "/:pageKey",
  validate(pageContentParamSchema),
  asyncHandler(pageContentController.getPublished)
);
