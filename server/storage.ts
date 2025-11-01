import type {
  User,
  Message,
  ChatConfig,
  MutedUser,
  BlockedWord,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  users: Map<string, User>;
  messages: Message[];
  config: ChatConfig;
  mutedUsers: Map<string, MutedUser>;
  blockedWords: Map<string, BlockedWord>;
  typingUsers: Map<string, number>;

  getUserById(id: string): User | undefined;
  getUserByUsername(username: string): User | undefined;
  addUser(user: User): void;
  removeUser(userId: string): void;
  updateUser(userId: string, updates: Partial<User>): void;
  
  addMessage(message: Message): void;
  getMessages(): Message[];
  getPendingMessages(): Message[];
  getApprovedMessages(): Message[];
  updateMessage(messageId: string, updates: Partial<Message>): void;
  deleteMessage(messageId: string): void;
  clearMessages(): void;
  
  getConfig(): ChatConfig;
  updateConfig(updates: Partial<ChatConfig>): void;
  
  addMutedUser(mutedUser: MutedUser): void;
  removeMutedUser(username: string): void;
  getMutedUsers(): MutedUser[];
  isUserMuted(username: string): boolean;
  
  addBlockedWord(word: string): void;
  removeBlockedWord(word: string): void;
  getBlockedWords(): BlockedWord[];
  containsBlockedWord(text: string): boolean;
  
  setUserTyping(username: string): void;
  removeUserTyping(username: string): void;
  getTypingUsers(): string[];
}

export class MemStorage implements IStorage {
  users: Map<string, User>;
  messages: Message[];
  config: ChatConfig;
  mutedUsers: Map<string, MutedUser>;
  blockedWords: Map<string, BlockedWord>;
  typingUsers: Map<string, number>;

  constructor() {
    this.users = new Map();
    this.messages = [];
    this.config = {
      enabled: true,
      cooldown: 0,
      simulationMode: false,
    };
    this.mutedUsers = new Map();
    this.blockedWords = new Map();
    this.typingUsers = new Map();
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  updateUser(userId: string, updates: Partial<User>): void {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, ...updates });
    }
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getPendingMessages(): Message[] {
    return this.messages.filter(
      (m) => m.status === "pending" && m.type === "normal"
    );
  }

  getApprovedMessages(): Message[] {
    return this.messages.filter(
      (m) => m.status === "approved" || m.type === "event" || m.type === "flash" || m.forcePublished
    );
  }

  updateMessage(messageId: string, updates: Partial<Message>): void {
    const index = this.messages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      this.messages[index] = { ...this.messages[index], ...updates };
    }
  }

  deleteMessage(messageId: string): void {
    this.messages = this.messages.filter((m) => m.id !== messageId);
  }

  clearMessages(): void {
    this.messages = [];
  }

  getConfig(): ChatConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  addMutedUser(mutedUser: MutedUser): void {
    this.mutedUsers.set(mutedUser.username, mutedUser);
    const user = this.getUserByUsername(mutedUser.username);
    if (user) {
      this.updateUser(user.id, {
        isMuted: true,
        mutedUntil: mutedUser.mutedUntil,
      });
    }
  }

  removeMutedUser(username: string): void {
    this.mutedUsers.delete(username);
    const user = this.getUserByUsername(username);
    if (user) {
      this.updateUser(user.id, {
        isMuted: false,
        mutedUntil: undefined,
      });
    }
  }

  getMutedUsers(): MutedUser[] {
    const now = Date.now();
    const activeMutes = Array.from(this.mutedUsers.values()).filter(
      (mu) => mu.mutedUntil > now
    );
    
    const expiredMutes = Array.from(this.mutedUsers.values()).filter(
      (mu) => mu.mutedUntil <= now
    );
    expiredMutes.forEach((mu) => this.removeMutedUser(mu.username));
    
    return activeMutes;
  }

  isUserMuted(username: string): boolean {
    const muted = this.mutedUsers.get(username);
    if (!muted) return false;
    if (muted.mutedUntil <= Date.now()) {
      this.removeMutedUser(username);
      return false;
    }
    return true;
  }

  addBlockedWord(word: string): void {
    this.blockedWords.set(word.toLowerCase(), {
      word: word.toLowerCase(),
      addedAt: Date.now(),
    });
  }

  removeBlockedWord(word: string): void {
    this.blockedWords.delete(word.toLowerCase());
  }

  getBlockedWords(): BlockedWord[] {
    return Array.from(this.blockedWords.values());
  }

  containsBlockedWord(text: string): boolean {
    const lowerText = text.toLowerCase();
    return Array.from(this.blockedWords.keys()).some((word) =>
      lowerText.includes(word)
    );
  }

  setUserTyping(username: string): void {
    this.typingUsers.set(username, Date.now());
  }

  removeUserTyping(username: string): void {
    this.typingUsers.delete(username);
  }

  getTypingUsers(): string[] {
    const now = Date.now();
    const activeTyping: string[] = [];
    
    Array.from(this.typingUsers.entries()).forEach(([username, timestamp]) => {
      if (now - timestamp < 5000) {
        activeTyping.push(username);
      } else {
        this.typingUsers.delete(username);
      }
    });
    
    return activeTyping;
  }
}

export const storage = new MemStorage();
