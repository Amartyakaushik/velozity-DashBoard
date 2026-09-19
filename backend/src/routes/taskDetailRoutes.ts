import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { listTasks, getTask, updateTask, updateTaskStatus } from "../controllers/taskController";

const router = Router();

router.use(authenticate);

// All three roles can list — scopedWhere() inside the controller restricts
// what each role actually sees; there's no role check here to block access
// because "no tasks match" (for a Developer, say) is a valid, safe result.
router.get("/", asyncHandler(listTasks));
router.get("/:id", asyncHandler(getTask));

// Only Admin/PM may edit task metadata (title, assignee, priority, due date).
router.patch("/:id", authorize("ADMIN", "PM"), asyncHandler(updateTask));

// All three roles may move status — assertTaskAccess() inside the
// controller still enforces that a Developer can only do this on their own
// assigned tasks, and a PM only within their own projects.
router.patch("/:id/status", authorize("ADMIN", "PM", "DEVELOPER"), asyncHandler(updateTaskStatus));

export default router;
