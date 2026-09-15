import { Router } from "express";
import { pageContentController } from "@/controllers/pageContentController";
import { validate } from "@/middleware/validate";
import { contentRateLimiter } from "@/middleware/rateLimit";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  hiddenFlagsQuerySchema,
  pageContentParamSchema
} from "@/validations/pageContentValidations";

export const pageContentRouter = Router();

// Anonymous reads of published content, exempted from the general API budget
// in `rateLimit.ts` and metered here instead.
pageContentRouter.use(contentRateLimiter);

pageContentRouter.get("/assets/*", asyncHandler(pageContentController.downloadAsset));

// Before `/:pageKey`, which would otherwise match "hidden" as a page key.
pageContentRouter.get(
  "/hidden",
  validate(hiddenFlagsQuerySchema),
  asyncHandler(pageContentController.getHiddenFlags)
);

pageContentRouter.get(
  "/:pageKey",
  validate(pageContentParamSchema),
  asyncHandler(pageContentController.getPublished)
);
