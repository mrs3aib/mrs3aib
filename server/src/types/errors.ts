export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    public readonly details?: unknown
  ) {
    super(422, message, "VALIDATION_ERROR");
  }
}

/**
 * A feature is switched off by configuration, not broken.
 *
 * Separate from a 500 so the caller can say "this is unavailable right now"
 * instead of "something went wrong" — the first is actionable, the second
 * invites a pointless retry.
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable") {
    super(503, message, "SERVICE_UNAVAILABLE");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message, "CONFLICT");
  }
}
