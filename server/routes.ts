import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { User, Message } from "@shared/schema";
import { randomUUID } from "crypto";

interface WebSocketClient extends WebSocket {
  userId?: string;
  username?: string;
  role?: string;
  isAlive?: boolean;
}

const CREDENTIALS: Record<string, string> = {
  ad: "adbk",
  shainez: "moije123456",
  gnoir: "Ballon:)2008",
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on("connection", (ws: WebSocketClient) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message, wss);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        storage.removeUser(ws.userId);
        storage.removeUserTyping(ws.username || "");
        broadcastUsers(wss);
        broadcastTypingUsers(wss);
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const client = ws as WebSocketClient;
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  return httpServer;
}

function handleWebSocketMessage(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  const { type } = message;

  switch (type) {
    case "auth":
      handleAuth(ws, message, wss);
      break;
    case "send_message":
      handleSendMessage(ws, message, wss);
      break;
    case "typing":
      handleTyping(ws, message, wss);
      break;
    case "approve_message":
      handleApproveMessage(ws, message, wss);
      break;
    case "reject_message":
      handleRejectMessage(ws, message, wss);
      break;
    case "force_publish":
      handleForcePublish(ws, message, wss);
      break;
    case "send_event":
      handleSendEvent(ws, message, wss);
      break;
    case "send_flash":
      handleSendFlash(ws, message, wss);
      break;
    case "update_config":
      handleUpdateConfig(ws, message, wss);
      break;
    case "mute_user":
      handleMuteUser(ws, message, wss);
      break;
    case "unmute_user":
      handleUnmuteUser(ws, message, wss);
      break;
    case "hide_user":
      handleHideUser(ws, message, wss);
      break;
    case "unhide_user":
      handleUnhideUser(ws, message, wss);
      break;
    case "add_blocked_word":
      handleAddBlockedWord(ws, message, wss);
      break;
    case "remove_blocked_word":
      handleRemoveBlockedWord(ws, message, wss);
      break;
    case "clear_history":
      handleClearHistory(ws, message, wss);
      break;
    case "reset_timers":
      handleResetTimers(ws, message, wss);
      break;
    case "trigger_animation":
      handleTriggerAnimation(ws, message, wss);
      break;
    case "export_history":
      handleExportHistory(ws, message);
      break;
  }
}

function handleAuth(ws: WebSocketClient, message: any, wss: WebSocketServer) {
  const { username, role } = message;
  
  if (!CREDENTIALS[username]) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid username" }));
    return;
  }

  const userId = randomUUID();
  ws.userId = userId;
  ws.username = username;
  ws.role = role;

  const user: User = {
    id: userId,
    username,
    role,
    isOnline: true,
    isMuted: storage.isUserMuted(username),
    mutedUntil: storage.getMutedUsers().find(mu => mu.username === username)?.mutedUntil,
    isHidden: storage.getUserByUsername(username)?.isHidden || false,
  };

  storage.addUser(user);

  ws.send(
    JSON.stringify({
      type: "initial_state",
      messages: storage.getApprovedMessages(),
      users: Array.from(storage.users.values()),
      config: storage.getConfig(),
      mutedUsers: storage.getMutedUsers(),
      blockedWords: storage.getBlockedWords(),
      pendingMessages: role === "gnoir" ? storage.getPendingMessages() : [],
    })
  );

  broadcastUsers(wss);
}

function handleSendMessage(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (!ws.username || !ws.userId) return;

  const { content } = message;

  if (!content || content.trim().length === 0) return;
  if (content.length > 1000) return;

  if (!storage.getConfig().enabled && ws.role !== "gnoir") {
    ws.send(JSON.stringify({ type: "error", message: "Chat is disabled" }));
    return;
  }

  if (storage.isUserMuted(ws.username)) {
    ws.send(JSON.stringify({ type: "error", message: "You are muted" }));
    return;
  }

  if (storage.containsBlockedWord(content)) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Message contains blocked words",
      })
    );
    return;
  }

  const newMessage: Message = {
    id: randomUUID(),
    userId: ws.userId,
    username: ws.username,
    role: ws.role!,
    content: content.trim(),
    timestamp: Date.now(),
    status: ws.role === "gnoir" ? "approved" : "pending",
    type: "normal",
  };

  storage.addMessage(newMessage);

  if (ws.role === "gnoir") {
    broadcast(wss, { type: "message", message: newMessage });
  } else {
    ws.send(JSON.stringify({ type: "pending_message", message: newMessage }));
    
    wss.clients.forEach((client) => {
      const c = client as WebSocketClient;
      if (c.readyState === WebSocket.OPEN && c.role === "gnoir") {
        c.send(JSON.stringify({ type: "pending_message", message: newMessage }));
      }
    });
  }

  storage.removeUserTyping(ws.username);
  broadcastTypingUsers(wss);
}

function handleTyping(ws: WebSocketClient, message: any, wss: WebSocketServer) {
  if (!ws.username) return;

  const { isTyping } = message;

  if (isTyping) {
    storage.setUserTyping(ws.username);
  } else {
    storage.removeUserTyping(ws.username);
  }

  broadcastTypingUsers(wss);
}

function handleApproveMessage(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { messageId } = message;
  storage.updateMessage(messageId, { status: "approved" });

  const msg = storage.getMessages().find(m => m.id === messageId);
  if (msg) {
    broadcast(wss, { type: "message", message: msg });
    broadcast(wss, { type: "message_approved", messageId });
  }
}

function handleRejectMessage(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { messageId } = message;
  storage.deleteMessage(messageId);
  broadcast(wss, { type: "message_rejected", messageId });
}

function handleForcePublish(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { messageId } = message;
  storage.updateMessage(messageId, { forcePublished: true, status: "approved" });

  const msg = storage.getMessages().find(m => m.id === messageId);
  if (msg) {
    broadcast(wss, { type: "message", message: msg });
    broadcast(wss, { type: "message_approved", messageId });
  }
}

function handleSendEvent(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { content } = message;
  if (!content) return;

  const eventMessage: Message = {
    id: randomUUID(),
    userId: ws.userId!,
    username: ws.username!,
    role: ws.role,
    content,
    timestamp: Date.now(),
    status: "approved",
    type: "event",
  };

  storage.addMessage(eventMessage);
  broadcast(wss, { type: "message", message: eventMessage });
}

function handleSendFlash(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { content, duration } = message;
  if (!content || !duration) return;

  const flashMessage: Message = {
    id: randomUUID(),
    userId: ws.userId!,
    username: ws.username!,
    role: ws.role,
    content,
    timestamp: Date.now(),
    status: "approved",
    type: "flash",
    flashDuration: duration,
  };

  storage.addMessage(flashMessage);
  broadcast(wss, { type: "flash_message", message: flashMessage });

  setTimeout(() => {
    storage.deleteMessage(flashMessage.id);
  }, duration * 1000);
}

function handleUpdateConfig(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { config } = message;
  
  if (config.timerMinutes !== undefined) {
    const timerEndTime = config.timerMinutes > 0
      ? Date.now() + config.timerMinutes * 60000
      : undefined;
    storage.updateConfig({ timerEndTime });
  } else {
    storage.updateConfig(config);
  }

  broadcast(wss, { type: "config_update", config: storage.getConfig() });
}

function handleMuteUser(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { username, duration } = message;
  const mutedUntil = Date.now() + duration * 60000;
  
  storage.addMutedUser({ username, mutedUntil });
  broadcast(wss, {
    type: "muted_users_update",
    mutedUsers: storage.getMutedUsers(),
  });
  broadcastUsers(wss);
}

function handleUnmuteUser(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { username } = message;
  storage.removeMutedUser(username);
  broadcast(wss, {
    type: "muted_users_update",
    mutedUsers: storage.getMutedUsers(),
  });
  broadcastUsers(wss);
}

function handleHideUser(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { username } = message;
  const user = storage.getUserByUsername(username);
  if (user) {
    storage.updateUser(user.id, { isHidden: true });
    broadcastUsers(wss);
  }
}

function handleUnhideUser(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { username } = message;
  const user = storage.getUserByUsername(username);
  if (user) {
    storage.updateUser(user.id, { isHidden: false });
    broadcastUsers(wss);
  }
}

function handleAddBlockedWord(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { word } = message;
  storage.addBlockedWord(word);
  broadcast(wss, {
    type: "blocked_words_update",
    blockedWords: storage.getBlockedWords(),
  });
}

function handleRemoveBlockedWord(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { word } = message;
  storage.removeBlockedWord(word);
  broadcast(wss, {
    type: "blocked_words_update",
    blockedWords: storage.getBlockedWords(),
  });
}

function handleClearHistory(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  storage.clearMessages();
  broadcast(wss, { type: "messages_cleared" });
}

function handleResetTimers(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  storage.updateConfig({ timerEndTime: undefined, cooldown: 0 });
  broadcast(wss, { type: "config_update", config: storage.getConfig() });
}

function handleTriggerAnimation(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "gnoir") return;

  const { animationType } = message;
  broadcast(wss, { type: "animation_trigger", animationType });
}

function handleExportHistory(ws: WebSocketClient, message: any) {
  if (ws.role !== "gnoir") return;

  const { format } = message;
  const messages = storage.getMessages();

  if (format === "json") {
    const jsonData = JSON.stringify(messages, null, 2);
    ws.send(
      JSON.stringify({
        type: "export_data",
        format: "json",
        data: jsonData,
        filename: `chat-history-${Date.now()}.json`,
      })
    );
  } else if (format === "text") {
    const textData = messages
      .map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleString()}] ${m.username}: ${m.content}`
      )
      .join("\n");
    ws.send(
      JSON.stringify({
        type: "export_data",
        format: "text",
        data: textData,
        filename: `chat-history-${Date.now()}.txt`,
      })
    );
  }
}

function broadcast(wss: WebSocketServer, data: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastUsers(wss: WebSocketServer) {
  const users = Array.from(storage.users.values());
  broadcast(wss, { type: "users_update", users });
}

function broadcastTypingUsers(wss: WebSocketServer) {
  const typingUsers = storage.getTypingUsers();
  broadcast(wss, { type: "typing_update", users: typingUsers });
}
