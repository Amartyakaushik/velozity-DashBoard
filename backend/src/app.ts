import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import taskDetailRoutes from "./routes/taskDetailRoutes";
import {
  notificationRouter,
  userRouter,
  clientRouter,
  dashboardRouter,
  activityRouter,
} from "./routes/miscRoutes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true, // required so the browser sends the HttpOnly refresh cookie
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskDetailRoutes);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/users", userRouter);
  app.use("/api/clients", clientRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/activity", activityRouter);

  // Must be registered last — catches errors from every route above.
  app.use(errorHandler);

  return app;
}
