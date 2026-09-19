import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10); // lower cost factor here just to keep seeding fast
}

async function main() {
  console.log("Seeding...");

  // Wipe in FK-safe order for repeatable seeding.
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("Password123!");

  const admin = await prisma.user.create({
    data: { name: "Asha Rao", email: "admin@velozity.dev", passwordHash: password, role: Role.ADMIN },
  });

  const pm1 = await prisma.user.create({
    data: { name: "Priya Menon", email: "pm1@velozity.dev", passwordHash: password, role: Role.PM },
  });
  const pm2 = await prisma.user.create({
    data: { name: "Karan Shah", email: "pm2@velozity.dev", passwordHash: password, role: Role.PM },
  });

  const dev1 = await prisma.user.create({
    data: { name: "Ravi Kumar", email: "dev1@velozity.dev", passwordHash: password, role: Role.DEVELOPER },
  });
  const dev2 = await prisma.user.create({
    data: { name: "Sneha Iyer", email: "dev2@velozity.dev", passwordHash: password, role: Role.DEVELOPER },
  });
  const dev3 = await prisma.user.create({
    data: { name: "Arjun Nair", email: "dev3@velozity.dev", passwordHash: password, role: Role.DEVELOPER },
  });
  const dev4 = await prisma.user.create({
    data: { name: "Meera Pillai", email: "dev4@velozity.dev", passwordHash: password, role: Role.DEVELOPER },
  });

  const clientA = await prisma.client.create({ data: { name: "Northwind Retail" } });
  const clientB = await prisma.client.create({ data: { name: "Bluepeak Logistics" } });
  const clientC = await prisma.client.create({ data: { name: "Fernbridge Health" } });

  const projectA = await prisma.project.create({
    data: { name: "Northwind Storefront Revamp", clientId: clientA.id, pmId: pm1.id, description: "Rebuild the e-commerce storefront." },
  });
  const projectB = await prisma.project.create({
    data: { name: "Bluepeak Fleet Tracker", clientId: clientB.id, pmId: pm1.id, description: "Real-time fleet tracking dashboard." },
  });
  const projectC = await prisma.project.create({
    data: { name: "Fernbridge Patient Portal", clientId: clientC.id, pmId: pm2.id, description: "Patient-facing appointment portal." },
  });

  const now = Date.now();
  const daysFromNow = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  type SeedTask = {
    title: string;
    project: typeof projectA;
    dev: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
  };

  const seedTasks: SeedTask[] = [
    { title: "Set up product catalog schema", project: projectA, dev: dev1.id, status: TaskStatus.DONE, priority: TaskPriority.HIGH, dueDate: daysFromNow(-10) },
    { title: "Build checkout flow", project: projectA, dev: dev1.id, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.CRITICAL, dueDate: daysFromNow(3) },
    { title: "Integrate payment gateway", project: projectA, dev: dev2.id, status: TaskStatus.TODO, priority: TaskPriority.HIGH, dueDate: daysFromNow(-2) }, // overdue
    { title: "Responsive nav redesign", project: projectA, dev: dev2.id, status: TaskStatus.IN_REVIEW, priority: TaskPriority.MEDIUM, dueDate: daysFromNow(1) },
    { title: "SEO metadata pass", project: projectA, dev: dev1.id, status: TaskStatus.TODO, priority: TaskPriority.LOW, dueDate: daysFromNow(14) },
    { title: "Live GPS ingestion service", project: projectB, dev: dev3.id, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.CRITICAL, dueDate: daysFromNow(2) },
    { title: "Map clustering for 500+ vehicles", project: projectB, dev: dev3.id, status: TaskStatus.TODO, priority: TaskPriority.HIGH, dueDate: daysFromNow(-1) }, // overdue
    { title: "Driver mobile ping endpoint", project: projectB, dev: dev4.id, status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, dueDate: daysFromNow(-5) },
    { title: "Geofence alert rules", project: projectB, dev: dev4.id, status: TaskStatus.IN_REVIEW, priority: TaskPriority.MEDIUM, dueDate: daysFromNow(4) },
    { title: "Fleet report CSV export", project: projectB, dev: dev3.id, status: TaskStatus.TODO, priority: TaskPriority.LOW, dueDate: daysFromNow(10) },
    { title: "Appointment booking calendar", project: projectC, dev: dev4.id, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, dueDate: daysFromNow(5) },
    { title: "HIPAA-compliant file storage", project: projectC, dev: dev4.id, status: TaskStatus.TODO, priority: TaskPriority.CRITICAL, dueDate: daysFromNow(6) },
    { title: "Patient reminder SMS job", project: projectC, dev: dev2.id, status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, dueDate: daysFromNow(9) },
    { title: "Doctor availability sync", project: projectC, dev: dev2.id, status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, dueDate: daysFromNow(-8) },
    { title: "Accessibility audit", project: projectC, dev: dev4.id, status: TaskStatus.IN_REVIEW, priority: TaskPriority.LOW, dueDate: daysFromNow(12) },
  ];

  const createdTasks = [];
  for (const t of seedTasks) {
    const isPastDue = t.dueDate.getTime() < now && t.status !== TaskStatus.DONE;
    const task = await prisma.task.create({
      data: {
        title: t.title,
        projectId: t.project.id,
        assignedDeveloperId: t.dev,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        isOverdue: isPastDue,
      },
    });
    createdTasks.push(task);
  }

  // Pre-existing activity so the feed isn't empty on first load.
  const actorMap: Record<string, { id: string; name: string }> = {
    [dev1.id]: { id: dev1.id, name: "Ravi Kumar" },
    [dev2.id]: { id: dev2.id, name: "Sneha Iyer" },
    [dev3.id]: { id: dev3.id, name: "Arjun Nair" },
    [dev4.id]: { id: dev4.id, name: "Meera Pillai" },
  };

  const STATUS_LABEL: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
  };

  for (const task of createdTasks.slice(0, 8)) {
    const actor = task.assignedDeveloperId ? actorMap[task.assignedDeveloperId] : null;
    if (!actor) continue;
    await prisma.activityLog.create({
      data: {
        projectId: task.projectId,
        taskId: task.id,
        actorId: actor.id,
        action: "STATUS_CHANGE",
        fromValue: "TODO",
        toValue: task.status,
        message: `${actor.name} moved Task #${task.number} from To Do \u2192 ${STATUS_LABEL[task.status]}`,
        createdAt: new Date(now - Math.random() * 1000 * 60 * 60 * 24 * 3),
      },
    });
  }

  console.log("Seed complete.");
  console.log("Login with any of these (password: Password123!):");
  console.log("  admin@velozity.dev (ADMIN)");
  console.log("  pm1@velozity.dev / pm2@velozity.dev (PM)");
  console.log("  dev1@velozity.dev ... dev4@velozity.dev (DEVELOPER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
