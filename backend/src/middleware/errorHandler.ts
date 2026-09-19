import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { isProd } from "../config/env";

// Every endpoint funnels errors here via next(err) or thrown errors in async
// handlers (see asyncHandler). No raw stack traces or driver error messages
// ever reach the client — only a stable, structured shape.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Unknown/unexpected error — log server-side, never leak internals.
  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Something went wrong. Please try again.",
      ...(isProd ? {} : { debug: err instanceof Error ? err.message : String(err) }),
    },
  });
}

// Wraps async route handlers so thrown/rejected errors reach errorHandler
// instead of crashing the process or hanging the request.
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
