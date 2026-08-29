import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

// Express 4 does not forward rejected promises from async handlers to the
// error middleware on its own — wrapping ensures every thrown/rejected
// error still reaches errorHandler instead of crashing the process.
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}
