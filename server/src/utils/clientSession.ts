import type { Request } from "express";
import { ForbiddenError, UnauthorizedError } from "@/types/errors";

/**
 * The session a signed-in client's gallery routes should act on.
 *
 * A self-registered client exists before an admin attaches them to a shoot, so
 * their token carries a null session. That is a normal state, not a broken
 * one — it is answered with "no gallery yet" rather than being allowed to
 * reach the gallery and download services, which have no meaningful behaviour
 * without a session id.
 */
export function requireClientSessionId(req: Request): string {
  if (req.auth?.role !== "client") {
    throw new UnauthorizedError("Client access required");
  }

  if (!req.auth.sessionId) {
    throw new ForbiddenError(
      "No gallery has been linked to your account yet. Please contact the studio."
    );
  }

  return req.auth.sessionId;
}
