export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthorized: (message = "Authentication required") =>
    new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have access to this resource") =>
    new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Resource not found") => new AppError(404, "NOT_FOUND", message),
  badRequest: (message = "Invalid request", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", message, details),
  conflict: (message = "Conflict") => new AppError(409, "CONFLICT", message),
  internal: (message = "Internal server error") => new AppError(500, "INTERNAL", message),
};
