import { Response } from "express";
import { isProd, env } from "../config/env";

const REFRESH_COOKIE_NAME = "refreshToken";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true, // never readable from JS — this is the whole point vs. localStorage
    secure: isProd, // HTTPS-only in production
    sameSite: isProd ? "none" : "lax", // "none" needed cross-site (Vercel frontend/backend on different domains) but requires secure
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: "/api/auth", // only sent to auth endpoints, minimizing exposure
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
}

export { REFRESH_COOKIE_NAME };
