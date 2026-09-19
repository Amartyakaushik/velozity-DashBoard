import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { createTask } from "../controllers/taskController";

// mergeParams so :projectId from the parent router (projectRoutes) is
// visible here. `authenticate` was already applied by the parent router.
const router = Router({ mergeParams: true });

router.post("/", authorize("ADMIN", "PM"), asyncHandler(createTask));

export default router;
