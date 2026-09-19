import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/auth";
import { Errors } from "../utils/errors";

// Extracts and verifies the short-lived access token from the Authorization
// header. This is the ONLY thing that grants req.user — nothing about role
// or identity is ever trusted from the request body or query string.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(Errors.unauthorized("Missing access token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(Errors.unauthorized("Access token invalid or expired"));
  }
}

// Coarse-grained role gate. Applied on top of `authenticate` on every
// protected route — this is enforced server-side and cannot be bypassed by a
// client that hides UI elements, or by forging a role in a request body.
// Fine-grained ownership checks (e.g. "this PM owns this project") happen
// separately inside each controller, since role alone isn't enough there.
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Errors.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(Errors.forbidden("Your role does not permit this action"));
    }
    next();
  };
}
