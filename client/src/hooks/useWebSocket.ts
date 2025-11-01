import { useEffect, useRef, useState, useCallback } from "react";
import type { Message, User, ChatConfig, MutedUser, BlockedWord } from "@shared/schema";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface ChatState {
  messages: Message[];
  users: User[];
  config: ChatConfig;
  mutedUsers: MutedUser[];
  blockedWords: BlockedWord[];
  typingUsers: string[];
  pendingMessages: Message[];
  flashMessages: Map<string, number>;
}

export function useWebSocket(username: string | null, role: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    users: [],
    config: { enabled: true, cooldown: 0, simulationMode: false, directChatEnabled: false },
    mutedUsers: [],
    blockedWords: [],
    typingUsers: [],
    pendingMessages: [],
    flashMessages: new Map(),
  });
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!username || !role) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: "auth", username, role }));
    };

    socket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      switch (data.type) {
        case "initial_state":
          setChatState(prev => ({
            ...prev,
            messages: data.messages || [],
            users: data.users || [],
            config: data.config || prev.config,
            mutedUsers: data.mutedUsers || [],
            blockedWords: data.blockedWords || [],
            pendingMessages: data.pendingMessages || [],
          }));
          break;

        case "message":
          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, data.message],
          }));
          break;

        case "flash_message":
          setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, data.message],
          }));
          setTimeout(() => {
            setChatState(current => ({
              ...current,
              messages: current.messages.filter(m => m.id !== data.message.id),
            }));
          }, data.message.flashDuration! * 1000);
          break;

        case "message_approved":
          setChatState(prev => ({
            ...prev,
            pendingMessages: prev.pendingMessages.filter(m => m.id !== data.messageId),
            messages: prev.messages.map(m =>
              m.id === data.messageId ? { ...m, status: "approved" as const } : m
            ),
          }));
          break;

        case "message_rejected":
          setChatState(prev => ({
            ...prev,
            pendingMessages: prev.pendingMessages.filter(m => m.id !== data.messageId),
            messages: prev.messages.filter(m => m.id !== data.messageId),
          }));
          break;

        case "pending_message":
          setChatState(prev => ({
            ...prev,
            pendingMessages: [...prev.pendingMessages, data.message],
          }));
          break;

        case "user_joined":
          setChatState(prev => ({
            ...prev,
            users: [...prev.users.filter(u => u.id !== data.user.id), data.user],
          }));
          break;

        case "user_left":
          setChatState(prev => ({
            ...prev,
            users: prev.users.filter(u => u.id !== data.userId),
          }));
          break;

        case "users_update":
          setChatState(prev => ({
            ...prev,
            users: data.users,
          }));
          break;

        case "typing_update":
          setChatState(prev => ({
            ...prev,
            typingUsers: data.users,
          }));
          break;

        case "config_update":
          setChatState(prev => ({
            ...prev,
            config: { ...prev.config, ...data.config },
          }));
          break;

        case "muted_users_update":
          setChatState(prev => ({
            ...prev,
            mutedUsers: data.mutedUsers,
          }));
          break;

        case "blocked_words_update":
          setChatState(prev => ({
            ...prev,
            blockedWords: data.blockedWords,
          }));
          break;

        case "messages_cleared":
          setChatState(prev => ({
            ...prev,
            messages: [],
            pendingMessages: [],
          }));
          break;

        case "animation_trigger":
          // Handle animation triggers (flash, warning badge, etc.)
          break;

        case "message_deleted":
          setChatState(prev => ({
            ...prev,
            messages: prev.messages.filter(m => m.id !== data.messageId),
            pendingMessages: prev.pendingMessages.filter(m => m.id !== data.messageId),
          }));
          break;
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [username, role]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "send_message", content }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing", isTyping }));
    }
  }, []);

  const approveMessage = useCallback((messageId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "approve_message", messageId }));
    }
  }, []);

  const rejectMessage = useCallback((messageId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "reject_message", messageId }));
    }
  }, []);

  const sendEvent = useCallback((content: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "send_event", content }));
    }
  }, []);

  const sendFlash = useCallback((content: string, duration: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "send_flash", content, duration }));
    }
  }, []);

  const updateConfig = useCallback((config: Partial<ChatConfig>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "update_config", config }));
    }
  }, []);

  const muteUser = useCallback((username: string, duration: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "mute_user", username, duration }));
    }
  }, []);

  const unmuteUser = useCallback((username: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "unmute_user", username }));
    }
  }, []);

  const hideUser = useCallback((username: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "hide_user", username }));
    }
  }, []);

  const unhideUser = useCallback((username: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "unhide_user", username }));
    }
  }, []);

  const addBlockedWord = useCallback((word: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "add_blocked_word", word }));
    }
  }, []);

  const removeBlockedWord = useCallback((word: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "remove_blocked_word", word }));
    }
  }, []);

  const clearHistory = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "clear_history" }));
    }
  }, []);

  const forcePublish = useCallback((messageId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "force_publish", messageId }));
    }
  }, []);

  const resetTimers = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "reset_timers" }));
    }
  }, []);

  const triggerAnimation = useCallback((animationType: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "trigger_animation", animationType }));
    }
  }, []);

  const exportHistory = useCallback((format: "text" | "json") => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "export_history", format }));
    }
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "delete_message", messageId }));
    }
  }, []);

  return {
    isConnected,
    chatState,
    sendMessage,
    sendTyping,
    approveMessage,
    rejectMessage,
    sendEvent,
    sendFlash,
    updateConfig,
    muteUser,
    unmuteUser,
    hideUser,
    unhideUser,
    addBlockedWord,
    removeBlockedWord,
    clearHistory,
    forcePublish,
    resetTimers,
    triggerAnimation,
    exportHistory,
    deleteMessage,
  };
}
