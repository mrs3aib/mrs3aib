import { Router } from "express";
import { clientController } from "@/controllers/clientController";
import { validate } from "@/middleware/validate";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  clientIdParamSchema,
  createClientSchema,
  listClientsSchema,
  resetClientPasswordSchema,
  updateClientSchema
} from "@/validations/clientValidations";

export const adminClientsRouter = Router();

adminClientsRouter.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/clients:
 *   get:
 *     tags: [Admin Clients]
 *     summary: List clients
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of clients }
 *   post:
 *     tags: [Admin Clients]
 *     summary: Create a client
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created client }
 *       409: { description: Phone number already in use }
 */
adminClientsRouter
  .route("/")
  .get(validate(listClientsSchema), asyncHandler(clientController.list))
  .post(validate(createClientSchema), asyncHandler(clientController.create));

/**
 * @openapi
 * /admin/clients/{id}:
 *   patch:
 *     tags: [Admin Clients]
 *     summary: Update a client
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated client }
 *   delete:
 *     tags: [Admin Clients]
 *     summary: Delete a client
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
adminClientsRouter
  .route("/:id")
  .patch(validate(updateClientSchema), asyncHandler(clientController.update))
  .delete(validate(clientIdParamSchema), asyncHandler(clientController.delete));

/**
 * @openapi
 * /admin/clients/{id}/password:
 *   put:
 *     tags: [Admin Clients]
 *     summary: Set a client's password (forgotten-password recovery)
 *     description: >
 *       Client login has no self-service reset — there is no OTP or email
 *       channel to send a link over — so recovery runs through the studio.
 *       Signs the client out everywhere.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Password set; the client's other sessions are revoked }
 *       404: { description: Client not found }
 */
adminClientsRouter.put(
  "/:id/password",
  validate(resetClientPasswordSchema),
  asyncHandler(clientController.resetPassword)
);
