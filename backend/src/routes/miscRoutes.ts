import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { listNotifications, markRead, markAllRead } from "../controllers/notificationController";
import { listDevelopers, listAllUsers } from "../controllers/userController";
import { listClients, createClient } from "../controllers/clientController";
import {
  getAdminDashboard,
  getPmDashboard,
  getDeveloperDashboard,
} from "../controllers/dashboardController";
import { getRecentActivityForUser } from "../services/activityLogService";

export const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get("/", asyncHandler(listNotifications));
notificationRouter.patch("/:id/read", asyncHandler(markRead));
notificationRouter.patch("/read-all", asyncHandler(markAllRead));

export const userRouter = Router();
userRouter.use(authenticate);
userRouter.get("/developers", authorize("ADMIN", "PM"), asyncHandler(listDevelopers));
userRouter.get("/", authorize("ADMIN"), asyncHandler(listAllUsers));

export const clientRouter = Router();
clientRouter.use(authenticate);
clientRouter.get("/", authorize("ADMIN", "PM"), asyncHandler(listClients));
clientRouter.post("/", authorize("ADMIN", "PM"), asyncHandler(createClient));

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get("/admin", authorize("ADMIN"), asyncHandler(getAdminDashboard));
dashboardRouter.get("/pm", authorize("PM"), asyncHandler(getPmDashboard));
dashboardRouter.get("/developer", authorize("DEVELOPER"), asyncHandler(getDeveloperDashboard));

export const activityRouter = Router();
activityRouter.use(authenticate);
// "Missed events" catch-up: always read from the DB (see service), role
// scoping is applied inside getRecentActivityForUser based on req.user.
activityRouter.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const events = await getRecentActivityForUser(req.user!.id, req.user!.role);
    res.json({ events });
  })
);
