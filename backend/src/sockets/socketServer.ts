import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/auth";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

// We chose Socket.io (over raw `ws`) specifically for: (1) automatic room
// management, which is how we implement server-side role filtering below
// instead of trusting the client to filter what it receives; (2) built-in
// reconnection/backoff on the client, which matters for the "catch up on
// missed events" requirement; (3) namespace/ack support if the app grows.
// See README for the full justification.

let io: SocketIOServer | null = null;

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    role: string;
  };
}

// userId -> count of open sockets (a user can have multiple tabs open)
const onlineUsers = new Map<string, number>();

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientOrigins,
      credentials: true,
    },
  });

  // Auth happens once, at the handshake, using the same short-lived access
  // token as REST calls — never trust a userId/role passed in the client's
  // connection payload.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing auth token"));
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data = { userId: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = (socket as AuthedSocket).data;

    // Personal room: how we deliver "events relevant to this specific user"
    // (their notifications, their assigned-task activity, or — for a PM —
    // events on projects they own) without the client doing any filtering.
    socket.join(`user:${userId}`);
    if (role === "ADMIN") {
      socket.join("role:ADMIN");
    }

    onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
    broadcastPresenceCount();

    socket.on("project:subscribe", async (projectId: string) => {
      if (typeof projectId !== "string") return;

      // Project-level rooms are for Admin/PM only. A Developer never joins
      // one — they receive activity solely via their personal room, scoped
      // to tasks assigned to them (see activityLogService). This handler
      // independently re-checks ownership against the database on every
      // subscribe call: we never trust that a client only asks to subscribe
      // to projects it's allowed to see, because a modified client could
      // request any projectId here just as easily as it could hit a REST
      // endpoint directly.
      if (role === "ADMIN") {
        socket.join(`project:${projectId}`);
        return;
      }
      if (role === "PM") {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { pmId: true },
        });
        if (project && project.pmId === userId) {
          socket.join(`project:${projectId}`);
        }
        // Silently no-op otherwise — a PM requesting another PM's project
        // room simply never gets joined, and gets no events for it.
      }
      // DEVELOPER: no-op — developers don't get project-wide rooms.
    });

    socket.on("project:unsubscribe", (projectId: string) => {
      if (typeof projectId === "string") {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on("disconnect", () => {
      const remaining = (onlineUsers.get(userId) ?? 1) - 1;
      if (remaining <= 0) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, remaining);
      }
      broadcastPresenceCount();
    });
  });

  return io;
}

function broadcastPresenceCount() {
  io?.to("role:ADMIN").emit("presence:count", { count: onlineUsers.size });
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

export function getOnlineUserCount(): number {
  return onlineUsers.size;
}
