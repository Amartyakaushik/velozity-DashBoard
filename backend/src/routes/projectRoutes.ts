import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { listProjects, getProject, createProject } from "../controllers/projectController";
import taskRoutes from "./taskRoutes";

const router = Router();

router.use(authenticate); // every route below requires a valid access token

router.get("/", authorize("ADMIN", "PM"), asyncHandler(listProjects));
router.post("/", authorize("ADMIN", "PM"), asyncHandler(createProject));
router.get("/:id", authorize("ADMIN", "PM", "DEVELOPER"), asyncHandler(getProject));

// Nested: /api/projects/:projectId/tasks
router.use("/:projectId/tasks", taskRoutes);

export default router;
