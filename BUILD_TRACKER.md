# Velozity Dashboard — Build Tracker

Use this file as the single source of truth if you switch machines or your
Antigravity free-tier quota resets mid-task. Update the checkboxes and the
**Session Log** at the bottom every time you stop working, so a fresh
Antigravity session (on any PC) can pick up exactly where you left off
without re-reading the whole spec.

---

## 0. Status at a glance

- [x] Backend — **100% complete**, built outside Antigravity (see `backend/`
      from `velozity-backend.zip`). Do not regenerate this. Auth, RBAC,
      Prisma schema, Socket.io role-filtered feed, notifications, overdue
      cron job, seed script, and README are all done.
- [x] Frontend scaffold
- [x] Auth context + token refresh
- [x] Role dashboards (Admin / PM / Developer)
- [x] Task list + filters (query params)
- [x] Live activity feed (Socket.io client)
- [x] Notification dropdown
- [ ] Deployment (frontend → Vercel, backend → Render/Railway)
- [ ] README finalized, Explanation paragraph written
- [ ] Submitted

---

## 1. One-time setup

1. Install Antigravity from the official download you started, sign in with
   your Google account.
2. `git init` your repo if you haven't (or clone the one you'll submit to).
3. Unzip `velozity-backend.zip` into `backend/` at the repo root.
4. Locally verify the backend runs (do this on whichever PC has Node/Postgres
   available — doesn't have to be the same one you run Antigravity on):
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run seed
   npm run dev
   ```
   Confirm `GET http://localhost:4000/health` returns `{"status":"ok"}`.
5. `git checkout -b antigravity-frontend` — keep all agent work off `main`
   until you've reviewed it.
6. Open the **repo root folder** (not just `frontend/`, which doesn't exist
   yet) in Antigravity.

**Quota-saving habits for the whole build:**
- Never ask Antigravity to touch or "review" `backend/` — point it at
  specific files only when a task needs to read a contract from them.
- One task per prompt below. Don't chain multiple steps into one message.
- Commit after every task that works. If a task's output is broken, fix it
  yourself or with a small follow-up prompt rather than re-running the same
  big prompt again (re-runs are the fastest way to burn quota).
- If you see a rate-limit/quota message, stop immediately, commit, update
  this file's checkboxes and Session Log, and resume later or on another PC.

---

## 2. Prompts — run these one at a time, in order

### Task 1 — Frontend scaffold
```
Build a React + TypeScript (Vite) frontend in a new frontend/ folder.
Do not modify anything in backend/. Read backend/src/routes/*.ts and
backend/src/controllers/*.ts to learn the exact API endpoints and
response shapes — treat that code as the source of truth for the contract,
don't invent different field names.

Set up: Vite + React + TypeScript, React Router, an axios instance with
baseURL from an env var VITE_API_URL, and a basic folder structure
(pages/, components/, context/, hooks/, api/, types/). Add a plain login
page that POSTs to /api/auth/login and stores the returned accessToken in
memory (React state/context) — never localStorage. Don't build anything
past login yet.
```
- [ ] Done — commit: `___________`

### Task 2 — Auth context + token refresh
```
In the existing frontend/ (don't touch backend/), build an AuthContext
that: holds the current user + accessToken in memory, exposes login/logout,
and calls POST /api/auth/refresh (credentials: 'include' so the HttpOnly
cookie is sent) to silently refresh the access token on 401 responses via
an axios response interceptor. On app load, attempt a silent refresh so a
returning user doesn't have to log in again if their refresh cookie is
still valid. Add role-based route guards using the user's role from
GET /api/auth/me.
```
- [ ] Done — commit: `___________`

### Task 3 — Role dashboards
```
In frontend/, build three dashboard pages that each fetch their matching
endpoint: Admin -> GET /api/dashboard/admin, PM -> GET /api/dashboard/pm,
Developer -> GET /api/dashboard/developer. Route each logged-in user to
the dashboard matching their role. Match the fields these endpoints
actually return (check backend/src/controllers/dashboardController.ts) —
don't guess field names. Keep styling simple/clean, no need for a design
system.
```
- [x] Done — commit: `___________`

### Task 4 — Task list with shareable filters
```
In frontend/, build a task list view backed by GET /api/tasks, supporting
status/priority/dueBefore/dueAfter/projectId as URL query parameters
(read/write them with React Router's useSearchParams so the filtered view
is a shareable URL, not just local component state). Add a status-update
control that calls PATCH /api/tasks/:id/status. Add a create-task form for
Admin/PM that POSTs to /api/projects/:projectId/tasks.
```
- [x] Done — commit: `___________`

### Task 5 — Live activity feed
```
In frontend/, build a Socket.io client (socket.io-client) that connects
with the current accessToken in the `auth` handshake option (see
backend/src/sockets/socketServer.ts for the exact handshake shape it
expects). On connect, call GET /api/activity/recent once to backfill the
last 20 events the user may have missed, then append any further
"activity:new" events live. Render each event using its precomputed
`message` field directly (don't reconstruct the "X moved Y" string
yourself). Admin should also see a live "presence:count" number on their
dashboard.
```
- [x] Done — commit: `___________`

### Task 6 — Notification dropdown
```
In frontend/, build a notification bell with an unread-count badge fed by
the "notification:unread_count" socket event, and a dropdown listing
GET /api/notifications results. Clicking one calls
PATCH /api/notifications/:id/read; a "mark all read" button calls
PATCH /api/notifications/read-all.
```
- [x] Done — commit: `___________`

### Task 7 — Polish pass (optional, only if quota allows)
```
In frontend/ only: tidy up loading/error states across pages, add basic
empty-state messaging, and make sure every fetch handles the backend's
structured error shape { error: { code, message } } instead of showing a
raw error.
```
- [x] Done — commit: `___________`

---

## 3. Deployment

- [ ] Backend deployed to Render or Railway free tier (Vercel serverless
      doesn't hold WebSocket connections well). Set env vars from
      `backend/.env.example`, plus `CLIENT_ORIGIN` = your Vercel frontend URL.
- [ ] Frontend deployed to Vercel. Set `VITE_API_URL` to the deployed
      backend URL.
- [ ] Confirm login + live activity feed work against the deployed URLs,
      not just localhost (cookie `sameSite`/`secure` settings only fully
      kick in over HTTPS — see `backend/src/utils/cookies.ts`).

---

## 4. Explanation field (150–250 words) — draft, edit before submitting

> The hardest problem was the real-time role-filtered activity feed:
> ensuring a Developer's socket could never receive another developer's or
> a PM's events, even if the client asked for them. Rather than
> broadcasting every event and filtering client-side, the server decides
> recipients at write time — an admin room, the owning PM's personal room,
> and the assigned developer's personal room — and independently
> re-validates project-room subscription requests against the database
> rather than trusting the client. Missed-event catchup is served from the
> database (last 20 by project/user scope), not an in-memory cache, so it
> survives server restarts. One thing I'd do differently: with more time
> I'd add the Socket.io Redis adapter so the feed logic works correctly
> across multiple backend instances, not just a single Node process.

---

## 5. Session log

Update this every time you stop, especially before switching machines.

| Date/time | Machine | What I completed | What's next | Antigravity quota status |
|---|---|---|---|---|
| 2026-09-19 17:50 IST | Mac (darwin-arm64) | Task 3: Admin/PM/Developer dashboards fetch the real dashboard endpoints, render only returned fields, and show loading/empty/nested API error states. Auth and backend left unchanged. | Task 4 — task list + shareable filters | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| 2026-09-19 17:55 IST | Mac (darwin-arm64) | Task 4: shareable /tasks filters (status, priority, dueBefore, dueAfter, projectId), status PATCH, Admin/PM create via POST /api/projects/:projectId/tasks. Backend untouched. | Task 5 — live Socket.IO activity feed | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| 2026-09-19 17:58 IST | Mac (darwin-arm64) | Cleanup: removed Task 4 browser test task "UI verification task" (#17) and its TASK_CREATED activity. All 15 seed tasks remain. Left "Task 4 verification task" (#16) in place (API test leftover; not the requested item). | Task 5 — live Socket.IO activity feed | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| 2026-09-19 17:59 IST | Mac (darwin-arm64) | Cleanup: removed leftover API test task #16 "Task 4 verification task" plus 1 TASK_CREATED activity and 1 TASK_ASSIGNED notification. All 15 seed tasks remain; no other non-seed tasks left. | Task 5 — live Socket.IO activity feed | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| 2026-09-19 18:03 IST | Mac (darwin-arm64) | Task 5: socket.io-client with auth.token, /api/activity/recent catch-up, live activity:new, Admin/PM project:subscribe, admin presence:count. Messages rendered from event.message. Backend untouched. | Task 6 — notification dropdown | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| 2026-09-19 18:11 IST | Mac (darwin-arm64) | Task 6: notification dropdown in DashboardShell — GET /api/notifications, unread badge via notification:unread_count, live notification:new, PATCH :id/read and /read-all. No polling, no userId sent. Backend untouched. | Task 7 — polish (optional) | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| 2026-09-19 18:16 IST | Mac (darwin-arm64) | Task 7: loading/empty/error polish; login reads nested { error: { message } }; leftover Vite CSS removed; tables wrap on small screens. Auth/RBAC/socket/notification APIs unchanged. Backend untouched. | Deployment (optional) | N/A (Cursor takeover; Antigravity quota was already exhausted) |
| | | | | |
