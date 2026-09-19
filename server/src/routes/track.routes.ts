import { Router } from "express";
import { analyticsController } from "@/controllers/analyticsController";
import { trackRateLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { trackVisitSchema } from "@/validations/analyticsValidations";

/**
 * The public site's analytics beacon.
 *
 * Unauthenticated by necessity — visitors are anonymous — and therefore the
 * one write endpoint on this API open to the world. It is kept deliberately
 * narrow: it accepts a path and creates exactly one row, has no read side, and
 * carries its own per-IP budget so a scripted caller cannot grow the table
 * without bound.
 */
export const trackRouter = Router();

/**
 * @openapi
 * /public/track:
 *   post:
 *     tags: [Public]
 *     summary: Record a page view from the public site
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [path]
 *             properties:
 *               path: { type: string, example: "/en/category/weddings" }
 *               referrer: { type: string }
 *               sessionId:
 *                 type: string
 *                 description: Set when the page is an album.
 *     responses:
 *       202: { description: Accepted; the row is written asynchronously }
 */
trackRouter.post(
  "/",
  trackRateLimiter,
  validate(trackVisitSchema),
  analyticsController.track
);
