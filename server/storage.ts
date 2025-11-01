import type {
  User,
  Message,
  ChatConfig,
  MutedUser,
  BlockedWord,
} from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const FILE_PATH = path.resolve("./chat-storage.json");

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

    this.loadFromDisk(); // 🟢 Charger les données sauvegardées au démarrage
  }

  // ------------------- USERS -------------------
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

  // ------------------- MESSAGES -------------------
  addMessage(message: Message): void {
    this.messages.push(message);
    this.saveToDisk();
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
      this.saveToDisk();
    }
  }

  deleteMessage(messageId: string): void {
    this.messages = this.messages.filter((m) => m.id !== messageId);
    this.saveToDisk();
  }

  clearMessages(): void {
    this.messages = [];
    this.saveToDisk();
  }

  // ------------------- CONFIG -------------------
  getConfig(): ChatConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToDisk();
  }

  // ------------------- MUTES -------------------
  addMutedUser(mutedUser: MutedUser): void {
    this.mutedUsers.set(mutedUser.username, mutedUser);
    const user = this.getUserByUsername(mutedUser.username);
    if (user) {
      this.updateUser(user.id, {
        isMuted: true,
        mutedUntil: mutedUser.mutedUntil,
      });
    }
    this.saveToDisk();
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
    this.saveToDisk();
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

  // ------------------- BLOCKED WORDS -------------------
  addBlockedWord(word: string): void {
    this.blockedWords.set(word.toLowerCase(), {
      word: word.toLowerCase(),
      addedAt: Date.now(),
    });
    this.saveToDisk();
  }

  removeBlockedWord(word: string): void {
    this.blockedWords.delete(word.toLowerCase());
    this.saveToDisk();
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

  // ------------------- TYPING -------------------
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

  // ------------------- PERSISTENCE -------------------
  private saveToDisk(): void {
    try {
      const data = {
        messages: this.messages,
        config: this.config,
        mutedUsers: Array.from(this.mutedUsers.values()),
        blockedWords: Array.from(this.blockedWords.values()),
      };
      fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Erreur sauvegarde chat-storage.json :", err);
    }
  }

  private loadFromDisk(): void {
    if (fs.existsSync(FILE_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
        this.messages = data.messages || [];
        this.config = data.config || this.config;
        this.mutedUsers = new Map(
          (data.mutedUsers || []).map((u: any) => [u.username, u])
        );
        this.blockedWords = new Map(
          (data.blockedWords || []).map((b: any) => [b.word.toLowerCase(), b])
        );
        console.log(
          `✅ ${this.messages.length} messages chargés depuis chat-storage.json`
        );
      } catch (err) {
        console.error("Erreur lecture chat-storage.json :", err);
      }
    }
  }
}

// ------------------- INSTANCE GLOBALE -------------------
export const storage = new MemStorage();
