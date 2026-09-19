import cron from "node-cron";
import { prisma } from "../config/prisma";

// We chose node-cron over Bull/BullMQ here because this job has no need for
// a durable job queue: it's a single idempotent sweep with no per-item
// retries, no external workers, and nothing to persist between runs beyond
// the Task rows themselves. Bull's Redis dependency would be pure overhead
// for "run this SQL update every N minutes." If a second background job
// needed distinct retry/backoff semantics or cross-process work
// distribution, Bull would be the right upgrade — see README.
export function startOverdueChecker() {
  // Runs every 5 minutes. On startup we also run it once immediately so
  // overdue state is correct even before the first scheduled tick.
  runSweep();
  cron.schedule("*/5 * * * *", runSweep);
}

async function runSweep() {
  try {
    const now = new Date();
    const result = await prisma.task.updateMany({
      where: {
        dueDate: { lt: now },
        isOverdue: false,
        status: { not: "DONE" },
      },
      data: { isOverdue: true },
    });
    if (result.count > 0) {
      console.log(`[overdueChecker] Flagged ${result.count} task(s) as overdue`);
    }
  } catch (err) {
    console.error("[overdueChecker] sweep failed:", err);
  }
}
