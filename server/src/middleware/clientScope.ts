import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "@/types/errors";

/**
 * Ensures a client can only ever act within the session their access
 * token was issued for — the core of "Cannot access other galleries".
 */
export function requireOwnSession(sessionIdParam = "sessionId") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.auth?.role !== "client") {
      next(new ForbiddenError("Client access required"));
      return;
    }

    /**
     * A client with no session yet (self-registered, not linked to a shoot)
     * matches nothing: `null` can never equal a requested session id, and the
     * fallback below keeps a missing param from trivially passing the check.
     */
    if (!req.auth.sessionId) {
      next(
        new ForbiddenError(
          "No gallery has been linked to your account yet. Please contact the studio."
        )
      );
      return;
    }

    const requestedSessionId = req.params[sessionIdParam] ?? req.auth.sessionId;
    if (requestedSessionId !== req.auth.sessionId) {
      next(new ForbiddenError("You do not have access to this gallery"));
      return;
    }

    next();
  };
}
