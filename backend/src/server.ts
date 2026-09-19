import { createServer } from "http";
import { createApp } from "./app";
import { initSocket } from "./sockets/socketServer";
import { startOverdueChecker } from "./jobs/overdueChecker";
import { env } from "./config/env";

const app = createApp();
const httpServer = createServer(app);

// Socket.io attaches to the same HTTP server/port as Express — one process,
// one port, simpler deploy story (relevant since Vercel serverless functions
// don't hold long-lived WebSocket connections well; see README for the
// recommended deploy split of frontend-on-Vercel / backend-on-a
// persistent-process host like Render or Railway).
initSocket(httpServer);
startOverdueChecker();

httpServer.listen(env.port, () => {
  console.log(`Velozity backend listening on port ${env.port}`);
});
