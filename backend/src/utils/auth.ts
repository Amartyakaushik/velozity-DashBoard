import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

// Refresh tokens are opaque random strings, not JWTs. We store only a SHA-256
// hash of the token server-side (in RefreshToken table) so a leaked DB dump
// alone can't be replayed as a valid cookie, and so tokens are individually
// revocable (rotation on every refresh, logout, or suspected reuse).
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(): Date {
  const days = env.refreshTokenTtlDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
