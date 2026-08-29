import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/types/errors";
import { logger } from "@/config/logger";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` }
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const validationError = new ValidationError("Validation failed", err.flatten());
    res.status(validationError.statusCode).json({
      error: {
        code: validationError.code,
        message: validationError.message,
        details: validationError.details
      }
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const appError = new ConflictError("A record with this value already exists");
      res.status(appError.statusCode).json({
        error: { code: appError.code, message: appError.message }
      });
      return;
    }
    if (err.code === "P2025") {
      const appError = new NotFoundError();
      res.status(appError.statusCode).json({
        error: { code: appError.code, message: appError.message }
      });
      return;
    }
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    res.status(err.statusCode).json({
      error: { code: err.code ?? "ERROR", message: err.message }
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" }
  });
}
