import { Router } from "express";
import { adminAuthController } from "@/controllers/adminAuthController";
import { requireAdmin, requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { authRateLimiter } from "@/middleware/rateLimit";
import { adminLoginSchema, updateAdminProfileSchema } from "@/validations/authValidations";
import { asyncHandler } from "@/utils/asyncHandler";

export const adminAuthRouter = Router();

/**
 * @openapi
 * /admin/auth/login:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Admin login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Access token and admin profile. Refresh token set as httpOnly cookie.
 *       401:
 *         description: Incorrect email or password
 */
adminAuthRouter.post(
  "/login",
  authRateLimiter,
  validate(adminLoginSchema),
  asyncHandler(adminAuthController.login)
);

/**
 * @openapi
 * /admin/auth/refresh:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Rotate the refresh token and issue a new access token
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Missing, invalid, or expired refresh token
 */
adminAuthRouter.post("/refresh", asyncHandler(adminAuthController.refresh));

/**
 * @openapi
 * /admin/auth/logout:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Revoke the current refresh token
 *     responses:
 *       204:
 *         description: Logged out
 */
adminAuthRouter.post("/logout", asyncHandler(adminAuthController.logout));

adminAuthRouter.patch(
  "/profile",
  requireAuth,
  requireAdmin,
  validate(updateAdminProfileSchema),
  asyncHandler(adminAuthController.updateProfile)
);
