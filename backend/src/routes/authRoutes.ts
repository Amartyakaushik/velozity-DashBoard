import { Router } from "express";
import { prisma } from "../config/prisma";
import {
  hashRefreshToken,
  generateRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyPassword,
} from "../utils/auth";
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE_NAME } from "../utils/cookies";
import { loginSchema } from "../validators/authValidators";
import { asyncHandler } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { Errors } from "../utils/errors";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      // Same error for "no such user" and "wrong password" — don't leak
      // which one it was.
      throw Errors.unauthorized("Invalid email or password");
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshTokenExpiry(),
      },
    });

    setRefreshCookie(res, refreshToken);
    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw Errors.unauthorized("No refresh token");

    const tokenHash = hashRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      // If a revoked/already-rotated token is presented, treat it as a
      // possible theft and revoke the whole chain for this user.
      if (stored) {
        await prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revoked: false },
          data: { revoked: true },
        });
      }
      clearRefreshCookie(res);
      throw Errors.unauthorized("Refresh token invalid — please log in again");
    }

    // Rotate: revoke the used token, issue a brand new one.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });
    const newRefreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: hashRefreshToken(newRefreshToken),
        expiresAt: refreshTokenExpiry(),
      },
    });
    setRefreshCookie(res, newRefreshToken);

    const accessToken = signAccessToken({ sub: stored.user.id, role: stored.user.role });
    res.json({
      accessToken,
      user: {
        id: stored.user.id,
        name: stored.user.name,
        email: stored.user.email,
        role: stored.user.role,
      },
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(token) },
        data: { revoked: true },
      });
    }
    clearRefreshCookie(res);
    res.json({ success: true });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw Errors.notFound("User not found");
    res.json({ user });
  })
);

export default router;
