import { Router } from "express";
import { clientAuthController } from "@/controllers/clientAuthController";
import { validate } from "@/middleware/validate";
import { authRateLimiter } from "@/middleware/rateLimit";
import { requireAuth, requireClient } from "@/middleware/auth";
import {
  changePasswordSchema,
  clientLoginSchema,
  clientRegisterSchema
} from "@/validations/authValidations";
import { asyncHandler } from "@/utils/asyncHandler";

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Client Auth]
 *     summary: Create a client account with phone, full name, and password
 *     description: >
 *       The account is created without a session attached — an admin links it
 *       to a shoot afterwards. The client is signed in on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name: { type: string, example: "Sara Al-Faisal" }
 *               phone: { type: string, example: "+971501234567" }
 *               password: { type: string, minLength: 8, maxLength: 72 }
 *     responses:
 *       201:
 *         description: Access token and client profile. Refresh token set as httpOnly cookie.
 *       409:
 *         description: An account already exists for this phone number
 */
authRouter.post(
  "/register",
  authRateLimiter,
  validate(clientRegisterSchema),
  asyncHandler(clientAuthController.register)
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Client Auth]
 *     summary: Sign in with phone number and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone: { type: string, example: "+971501234567" }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Access token and client profile. Refresh token set as httpOnly cookie.
 *       401:
 *         description: Incorrect phone number or password
 */
authRouter.post(
  "/login",
  authRateLimiter,
  validate(clientLoginSchema),
  asyncHandler(clientAuthController.login)
);

/**
 * @openapi
 * /auth/password:
 *   patch:
 *     tags: [Client Auth]
 *     summary: Change your own password
 *     description: >
 *       Revokes every refresh token for the account, signing out all other
 *       devices. A client who has forgotten their password cannot use this —
 *       an admin resets it from the client list instead.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8, maxLength: 72 }
 *     responses:
 *       204:
 *         description: Password changed; all sessions signed out
 *       401:
 *         description: Incorrect current password
 */
authRouter.patch(
  "/password",
  authRateLimiter,
  requireAuth,
  requireClient,
  validate(changePasswordSchema),
  asyncHandler(clientAuthController.changePassword)
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Client Auth]
 *     summary: The signed-in client's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Client profile. `sessionId` is null until an admin attaches a gallery.
 *       401:
 *         description: Missing or invalid access token
 */
authRouter.get(
  "/me",
  requireAuth,
  requireClient,
  asyncHandler(clientAuthController.me)
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Client Auth]
 *     summary: Rotate the refresh token and issue a new access token
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Missing, invalid, or expired refresh token
 */
authRouter.post("/refresh", asyncHandler(clientAuthController.refresh));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Client Auth]
 *     summary: Revoke the current refresh token
 *     responses:
 *       204:
 *         description: Logged out
 */
authRouter.post("/logout", asyncHandler(clientAuthController.logout));
