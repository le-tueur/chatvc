import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GitHubStorage } from "./github-storage";
import type { User, Message, UserRole, ChatConfig } from "@shared/schema";
import { randomUUID } from "crypto";

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

export const storage = new GitHubStorage(githubToken);

interface WebSocketClient extends WebSocket {
  userId?: string;
  username?: string;
  role?: string;
  isAlive?: boolean;
}

const CREDENTIALS: Record<string, string> = {
  ad: "adbk",
  shainez: "WVFw*{~a<;A*}3>&4yR~caoa#hrbr|z=E?M4`z$7,bZC2r+r>dAt-GU]C_o3)kXQSEE`9>o|e[D8qgxPy^C~QW-vQSt#PT$%[=}O8N(EzuI5E(V%>OwT}.LLmV}mu^+&@SXz<|P?A2([1m{u`982^qSLtf!Q]}`8ev;VM^D/lYOHm/%/6=JXY0Z,kU<md&^JQ~!@Rt`CHxyU?(,43KaJ7G#w4wI?Uociv>Dy@<z]%y@]up.G_{~|VZoZurAj0eUS",
  pronBOT: "Ballon:)2008",
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize GitHub storage
  await storage.initialize();
  
  const httpServer = createServer(app);
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Timer check interval
  setInterval(() => {
    const config = storage.getConfig();
    if (config.timerEndTime && Date.now() >= config.timerEndTime) {
      storage.updateConfig({ enabled: false, timerEndTime: undefined });
      const systemMessage: Message = {
        id: randomUUID(),
        userId: "system",
        username: "Système",
        role: "pronBOT",
        content: "⏰ Le chat est fermé, fin du timer.",
        timestamp: Date.now(),
        status: "approved",
        type: "event",
      };
      storage.addMessage(systemMessage);
      broadcast(wss, { type: "message", message: systemMessage });
      broadcast(wss, { type: "config_update", config: storage.getConfig() });
    }
  }, 1000); // Check every second

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
    case "delete_message":
      handleDeleteMessage(ws, message, wss);
      break;
    case "send_warning":
      handleSendWarning(ws, message, wss);
      break;
  }
}

function handleAuth(ws: WebSocketClient, message: any, wss: WebSocketServer) {
  const { username, role } = message;
  
  if (!CREDENTIALS[username]) {
    ws.send(JSON.stringify({ type: "error", message: "Nom d'utilisateur invalide" }));
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
  pendingMessages: role === "pronBOT" ? storage.getPendingMessages() : [],
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

  if (!storage.getConfig().enabled && ws.role !== "pronBOT") {
    ws.send(JSON.stringify({ type: "error", message: "Le chat est désactivé" }));
    return;
  }

  if (storage.isUserMuted(ws.username)) {
    ws.send(JSON.stringify({ type: "error", message: "Vous êtes en sourdine" }));
    return;
  }

  if (storage.containsBlockedWord(content)) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Le message contient des mots bloqués",
      })
    );
    return;
  }

  const config = storage.getConfig();
  const autoApprove = ws.role === "pronBOT" || config.directChatEnabled;

const newMessage: Message = {
  id: randomUUID(),
  userId: ws.userId,
  username: ws.username,
  role: ws.role! as UserRole,  // ✅ Cast explicite
  content: content.trim(),
  timestamp: Date.now(),
  status: autoApprove ? "approved" : "pending",
  type: "normal",
  };

  storage.addMessage(newMessage);

  if (autoApprove) {
    broadcast(wss, { type: "message", message: newMessage });
  } else {
    ws.send(JSON.stringify({ type: "pending_message", message: newMessage }));
    
    wss.clients.forEach((client) => {
      const c = client as WebSocketClient;
  if (c.readyState === WebSocket.OPEN && c.role === "pronBOT") {
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
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

  const { messageId } = message;
  storage.deleteMessage(messageId);
  broadcast(wss, { type: "message_rejected", messageId });
}

function handleForcePublish(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

  const { content } = message;
  if (!content) return;

  const eventMessage: Message = {
    id: randomUUID(),
    userId: ws.userId!,
    username: ws.username!,
    role: "pronBOT",
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
  if (ws.role !== "pronBOT") return;

  const { content, duration } = message;
  if (!content || !duration) return;

  const flashMessage: Message = {
    id: randomUUID(),
    userId: ws.userId!,
    username: ws.username!,
    role: "pronBOT",
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
  if (ws.role !== "pronBOT") return;

  const { config } = message;
  
  const updates: Partial<ChatConfig> = {};
  
  if (config.timerMinutes !== undefined) {
    updates.timerEndTime = config.timerMinutes > 0
      ? Date.now() + config.timerMinutes * 60000
      : undefined;
  }
  
  if (config.enabled !== undefined) {
    updates.enabled = config.enabled;
  }
  
  if (config.cooldown !== undefined) {
    updates.cooldown = config.cooldown;
  }
  
  if (config.simulationMode !== undefined) {
    updates.simulationMode = config.simulationMode;
  }
  
  if (config.directChatEnabled !== undefined) {
    updates.directChatEnabled = config.directChatEnabled;
  }

  storage.updateConfig(updates);
  broadcast(wss, { type: "config_update", config: storage.getConfig() });
}

function handleMuteUser(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

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
  if (ws.role !== "pronBOT") return;

  storage.clearMessages();
  broadcast(wss, { type: "messages_cleared" });
}

function handleResetTimers(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "pronBOT") return;

  storage.updateConfig({ timerEndTime: undefined, cooldown: 0 });
  broadcast(wss, { type: "config_update", config: storage.getConfig() });
}

function handleTriggerAnimation(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "pronBOT") return;

  const { animationType } = message;
  broadcast(wss, { type: "animation_trigger", animationType });
}

async function handleExportHistory(ws: WebSocketClient, message: any) {
  if (ws.role !== "pronBOT") return;

  const { format } = message;

  if (format === "json") {
    // Export the full GitHub storage data
    const storageData = await storage.getStorageDataForExport();
    const jsonData = JSON.stringify(storageData, null, 2);
    ws.send(
      JSON.stringify({
        type: "export_data",
        format: "json",
        data: jsonData,
        filename: `chat-storage.json`,
      })
    );
  } else if (format === "text") {
    // Export as formatted text with detailed information
    const messages = storage.getMessages();
    const config = storage.getConfig();
    const exportDate = new Date();
    
    const header = [
      "═══════════════════════════════════════════════════════════════",
      "         EXPORT DE L'HISTORIQUE DU CHAT - RAPPORT DÉTAILLÉ",
      "═══════════════════════════════════════════════════════════════",
      `Date d'export: ${exportDate.toLocaleString('fr-FR')}`,
      `Total de messages: ${messages.filter(m => m.status === "approved" || m.type === "event" || m.type === "flash").length}`,
      `Statut du chat: ${config.enabled ? 'Activé' : 'Désactivé'}`,
      `Mode chat direct: ${config.directChatEnabled ? 'Activé' : 'Désactivé'}`,
      `Cooldown: ${config.cooldown} secondes`,
      "═══════════════════════════════════════════════════════════════",
      "",
    ].join("\n");
    
    const messageLines = messages
      .filter(m => m.status === "approved" || m.type === "event" || m.type === "flash")
      .map((m) => {
        const date = new Date(m.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR');
        const roleLabel = m.role === "pronBOT" ? "[ADMIN]" : `[${m.role}]`;
        const typeLabel = m.type === "event" ? "[ÉVÉNEMENT]" : m.type === "flash" ? "[FLASH]" : "";
        const statusLabel = m.forcePublished ? "[FORCÉ]" : "";
        
        return `${dateStr} ${timeStr} ${roleLabel}${typeLabel}${statusLabel} ${m.username}: ${m.content}`;
      })
      .join("\n");
    
    const footer = [
      "",
      "═══════════════════════════════════════════════════════════════",
      "                    FIN DE L'EXPORT",
      "═══════════════════════════════════════════════════════════════",
    ].join("\n");
    
    const textData = header + messageLines + footer;
    
    const filename = `chat-export-${exportDate.toISOString().split('T')[0]}.txt`;
    
    ws.send(
      JSON.stringify({
        type: "export_data",
        format: "text",
        data: textData,
        filename,
      })
    );
  }
}

function handleDeleteMessage(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "pronBOT") return;

  const { messageId } = message;
  storage.deleteMessage(messageId);
  broadcast(wss, { type: "message_deleted", messageId });
}

function handleSendWarning(
  ws: WebSocketClient,
  message: any,
  wss: WebSocketServer
) {
  if (ws.role !== "pronBOT") return;

  const { content } = message;
  if (!content) return;

  const warningMessage: Message = {
    id: randomUUID(),
    userId: ws.userId!,
    username: "⚠️ Avertissement",
    role: "pronBOT",
    content,
    timestamp: Date.now(),
    status: "approved",
    type: "event",
  };

  storage.addMessage(warningMessage);
  broadcast(wss, { type: "message", message: warningMessage });
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
