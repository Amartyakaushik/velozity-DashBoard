# Velozity Global Solutions — Backend

Real-time client project dashboard API: JWT auth with rotating refresh tokens,
server-enforced role-based access control, a Socket.io activity feed that is
filtered server-side per role, and a scheduled overdue-task job.

## Local setup

1. **Database**: create a free Postgres instance on [Neon](https://neon.tech)
   (or use Supabase, or `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16`).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and two random
   secrets (`openssl rand -base64 48` for each of `JWT_ACCESS_SECRET` /
   `JWT_REFRESH_SECRET`).
3. Install and migrate:
   ```bash
   npm install
   npx prisma migrate dev --name init
   npm run seed
   npm run dev
   ```
4. API listens on `http://localhost:4000`. Health check: `GET /health`.

### Docker (optional, full stack)

```yaml
# docker-compose.yml (place at repo root, alongside backend/ and frontend/)
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: velozity
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```
Point `DATABASE_URL` at `postgresql://postgres:postgres@localhost:5432/velozity`.

## Seeded accounts (password for all: `Password123!`)

| Role | Email |
|---|---|
| Admin | admin@velozity.dev |
| PM | pm1@velozity.dev, pm2@velozity.dev |
| Developer | dev1@velozity.dev .. dev4@velozity.dev |

## Database schema

`User(role) -> Project(pmId, clientId) -> Task(projectId, assignedDeveloperId) -> ActivityLog / Notification`

- `RefreshToken` is a separate table (not embedded on `User`) so a token is
  individually revocable and multiple devices/sessions don't collide.
- `ActivityLog` stores a precomputed human-readable `message` at write time
  (not derived at read time) so the feed format never depends on join-time
  logic and old entries render correctly even if a task/user is later
  renamed or deleted (`taskId`/`actorId` are nullable-safe via `onDelete`).
- `Task.isOverdue` is a stored boolean set exclusively by the cron job in
  `src/jobs/overdueChecker.ts` — never computed on read — per the
  requirement that flagging happens via a scheduled job.

**Indexes and why:**
- `Task(projectId)`, `Task(assignedDeveloperId)`, `Task(status)`,
  `Task(priority)`, `Task(dueDate)`, `Task(isOverdue)` — every dashboard and
  filter query (`?status=&priority=&dueBefore=&dueAfter=`) filters on one or
  more of these; without them each filtered list becomes a sequential scan
  as task volume grows.
- `ActivityLog(projectId, createdAt)` — composite index because the feed's
  two real queries are "events for project X, newest first" and "last 20
  events for project X after timestamp Y." A single-column index on
  `projectId` alone would still need to sort the full result set.
- `Notification(userId, read)` and `Notification(userId, createdAt)` — the
  notification bell polls "unread count for this user" and "recent
  notifications for this user" on nearly every request.
- `Project(pmId)` — every PM-scoped query (`WHERE pmId = ?`) hits this.

## Architectural decisions

**WebSocket library: Socket.io**, not raw `ws`. Reasons: (1) room-based
broadcast is exactly how role-filtering is implemented — a user is only ever
in the rooms they're authorized for (`role:ADMIN`, `user:{id}`,
`project:{id}` after a server-side ownership check), so filtering happens by
construction rather than by the client discarding events; (2) automatic
reconnection with backoff, which matters for "catch up on missed events";
(3) a namespaced event API (`activity:new`, `notification:new`,
`presence:count`) that's easy to test and extend.

**Backend framework: Express.** Chosen over Fastify for the wider
middleware ecosystem and because the team's familiarity favors faster,
lower-risk delivery under a tight deadline — Fastify's raw throughput
advantage isn't the bottleneck for an internal agency tool at this scale.

**Background job: node-cron**, not Bull/BullMQ. The only background job in
this app is a single idempotent `UPDATE ... WHERE dueDate < now()` sweep. It
needs no retry policy, no distributed workers, and no persistence beyond the
`Task` rows it's updating — a Redis-backed queue would add an operational
dependency with no corresponding benefit here. Bull would be the right
choice the moment a job needs per-item retries, delayed execution, or
work distributed across multiple server instances.

**Token storage:** access token is short-lived (15 min) and returned in the
JSON body, kept in memory on the frontend (never localStorage) — a stolen
access token expires quickly and is never exposed to XSS via storage APIs.
The refresh token is long-lived, opaque (not a JWT), stored **only** as a
SHA-256 hash in the database, and set as an **HttpOnly, SameSite** cookie
scoped to `/api/auth` — JavaScript can never read it, and it's rotated
(revoke-old/issue-new) on every use, so a replayed old refresh token is
detected and used as a signal to revoke that user's entire token chain.

**Role enforcement:** every protected route runs `authenticate` (verifies
the JWT) then, where applicable, `authorize(...)` (coarse role gate) —
enforced at the Express middleware layer, never assumed from the frontend.
Fine-grained ownership (a PM's own projects only, a Developer's own tasks
only) is enforced again inside each controller by building the Prisma
`where` clause from `req.user`, never from a client-supplied id — see
`scopedWhere()` in `taskController.ts`. This means presenting a valid token
for Developer A can never return Developer B's or a PM's data, regardless of
what id is placed in the URL.

## Known limitations

- Admin cannot currently reassign a project to a different PM after creation.
- Refresh token rotation revokes the whole chain on reuse-detection, which
  is intentionally aggressive (logs the user out everywhere) — a production
  version might instead alert and allow a grace window.
- Socket.io and the HTTP API run in the same Node process; horizontal
  scaling across multiple instances would need the Socket.io Redis adapter,
  which isn't wired up here.
- No file/document attachments on tasks.
- No email delivery for notifications — in-app only, as specified.
