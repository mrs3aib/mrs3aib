import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// Validates and replaces req.body/params/query with the parsed (and
// type-coerced, e.g. numeric query strings) result, so downstream code can
// trust the shape without re-checking it.
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    const parsed = result.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;
    if (parsed.query !== undefined) req.query = parsed.query as typeof req.query;

    next();
  };
}
