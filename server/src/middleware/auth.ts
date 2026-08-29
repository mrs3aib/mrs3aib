import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/auth/jwt";
import { UnauthorizedError, ForbiddenError } from "@/types/errors";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(new UnauthorizedError("Missing access token"));
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== "admin") {
    next(new ForbiddenError("Admin access required"));
    return;
  }
  next();
}

export function requireClient(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== "client") {
    next(new ForbiddenError("Client access required"));
    return;
  }
  next();
}
