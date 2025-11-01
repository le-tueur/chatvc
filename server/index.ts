import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// ---------------------------
// Logging Middleware
// ---------------------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// ---------------------------
// Async Server Setup
// ---------------------------
(async () => {
  // ⚡ Charger les données depuis GitHub avant tout
  await storage.loadFromGitHub();

  const server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: { origin: "*" },
  });

  await registerRoutes(app);

  // ---------------------------
  // SOCKET.IO - Gestion du chat
  // ---------------------------
  io.on("connection", (socket) => {
    console.log("🟢 Nouveau client connecté:", socket.id);

    // → Envoi des messages existants au nouvel utilisateur
    socket.emit("chat:init", {
      messages: storage.getApprovedMessages(),
      config: storage.getConfig(),
    });

    // → Nouveau message
    socket.on("chat:message", async (msg) => {
      const containsBadWord = storage.containsBlockedWord(msg.content);
      const isMuted = storage.isUserMuted(msg.username);

      if (isMuted) {
        socket.emit("chat:error", "Vous êtes actuellement muet.");
        return;
      }

      const message = {
        ...msg,
        id: msg.id || Math.random().toString(36).slice(2),
        createdAt: Date.now(),
        status: containsBadWord ? "pending" : "approved",
      };

      await storage.addMessage(message);

      if (message.status === "approved") {
        io.emit("chat:newMessage", message);
      } else {
        io.emit("chat:pending", message);
      }
    });

    // → Message approuvé ou rejeté par admin
    socket.on("chat:moderate", async ({ id, action }) => {
      if (action === "approve") {
        await storage.updateMessage(id, { status: "approved" });
        const msg = storage.getMessages().find((m) => m.id === id);
        if (msg) io.emit("chat:newMessage", msg);
      } else if (action === "reject") {
        await storage.updateMessage(id, { status: "rejected" });
        io.emit("chat:remove", id);
      }
    });

    // → Gestion typing
    socket.on("chat:typing", (username) => {
      storage.setUserTyping(username);
      io.emit("chat:typingUsers", storage.getTypingUsers());
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client déconnecté:", socket.id);
    });
  });

  // ---------------------------
  // Gestion des erreurs
  // ---------------------------
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Erreur interne du serveur";
    res.status(status).json({ message });
    console.error("❌ ERREUR SERVEUR :", err);
  });

  // ---------------------------
  // Setup Vite ou fichiers statiques
  // ---------------------------
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ---------------------------
  // Lancer le serveur
  // ---------------------------
  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, () => {
    console.log(`🚀 Serveur + Socket.io en écoute sur le port ${PORT}`);
  });
})();

