// storage.ts
import type { User, Message, ChatConfig, MutedUser, BlockedWord } from "@shared/schema";
import { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } from "./config";
import fetch from "node-fetch";

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

  addMessage(message: Message): Promise<void>;
  getMessages(): Message[];
  getPendingMessages(): Message[];
  getApprovedMessages(): Message[];
  updateMessage(messageId: string, updates: Partial<Message>): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  clearMessages(): Promise<void>;

  getConfig(): ChatConfig;
  updateConfig(updates: Partial<ChatConfig>): Promise<void>;

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

interface GitHubFile {
  sha: string;
  content: string;
}

export class GitHubStorage implements IStorage {
  users: Map<string, User> = new Map();
  messages: Message[] = [];
  config: ChatConfig = { enabled: true, cooldown: 0, simulationMode: false };
  mutedUsers: Map<string, MutedUser> = new Map();
  blockedWords: Map<string, BlockedWord> = new Map();
  typingUsers: Map<string, number> = new Map();

  private filePath = "chat-data.json";
  private fileSha: string | null = null;

  constructor() {}

  // ---------------------------
  // GitHub persistence
  // ---------------------------
  private async githubRequest(endpoint: string, method = "GET", body?: any) {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${this.filePath}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async loadFromGitHub() {
    try {
      const res: any = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${this.filePath}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
      });
      if (res.status === 404) {
        console.log("⚠️ chat-data.json introuvable, initialisation d’un nouveau fichier.");
        await this.saveToGitHub(); // créer le fichier
        return;
      }
      const data: GitHubFile = await res.json();
      this.fileSha = data.sha;
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      const json = JSON.parse(decoded);
      this.messages = json.messages || [];
      this.config = json.config || this.config;
      console.log("✅ chat-data.json chargé depuis GitHub");
    } catch (err) {
      console.error("❌ Erreur chargement chat-data.json:", err);
    }
  }

  private async saveToGitHub() {
    const body = {
      message: "Update chat data",
      content: Buffer.from(JSON.stringify({ messages: this.messages, config: this.config }, null, 2)).toString("base64"),
      branch: GITHUB_BRANCH,
      sha: this.fileSha || undefined,
    };
    try {
      const res: any = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${this.filePath}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      this.fileSha = json.content?.sha;
    } catch (err) {
      console.error("❌ Erreur sauvegarde chat-data.json:", err);
    }
  }

  // ---------------------------
  // Users
  // ---------------------------
  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }
  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }
  addUser(user: User): void { this.users.set(user.id, user); }
  removeUser(userId: string): void { this.users.delete(userId); }
  updateUser(userId: string, updates: Partial<User>): void {
    const user = this.users.get(userId);
    if (user) this.users.set(userId, { ...user, ...updates });
  }

  // ---------------------------
  // Messages
  // ---------------------------
  async addMessage(message: Message) {
    this.messages.push(message);
    await this.saveToGitHub();
  }

  getMessages(): Message[] { return this.messages; }
  getPendingMessages(): Message[] { return this.messages.filter(m => m.status === "pending" && m.type === "normal"); }
  getApprovedMessages(): Message[] { return this.messages.filter(m => m.status === "approved" || m.type === "event" || m.type === "flash" || m.forcePublished); }

  async updateMessage(messageId: string, updates: Partial<Message>) {
    const idx = this.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      this.messages[idx] = { ...this.messages[idx], ...updates };
      await this.saveToGitHub();
    }
  }

  async deleteMessage(messageId: string) {
    this.messages = this.messages.filter(m => m.id !== messageId);
    await this.saveToGitHub();
  }

  async clearMessages() {
    this.messages = [];
    await this.saveToGitHub();
  }

  // ---------------------------
  // Config
  // ---------------------------
  getConfig(): ChatConfig { return this.config; }
  async updateConfig(updates: Partial<ChatConfig>) {
    this.config = { ...this.config, ...updates };
    await this.saveToGitHub();
  }

  // ---------------------------
  // Muted users
  // ---------------------------
  addMutedUser(mu: MutedUser): void {
    this.mutedUsers.set(mu.username, mu);
    const user = this.getUserByUsername(mu.username);
    if (user) this.updateUser(user.id, { isMuted: true, mutedUntil: mu.mutedUntil });
  }
  removeMutedUser(username: string): void {
    this.mutedUsers.delete(username);
    const user = this.getUserByUsername(username);
    if (user) this.updateUser(user.id, { isMuted: false, mutedUntil: undefined });
  }
  getMutedUsers(): MutedUser[] {
    const now = Date.now();
    const active = Array.from(this.mutedUsers.values()).filter(mu => mu.mutedUntil > now);
    const expired = Array.from(this.mutedUsers.values()).filter(mu => mu.mutedUntil <= now);
    expired.forEach(mu => this.removeMutedUser(mu.username));
    return active;
  }
  isUserMuted(username: string): boolean {
    const mu = this.mutedUsers.get(username);
    if (!mu) return false;
    if (mu.mutedUntil <= Date.now()) { this.removeMutedUser(username); return false; }
    return true;
  }

  // ---------------------------
  // Blocked words
  // ---------------------------
  addBlockedWord(word: string): void { this.blockedWords.set(word.toLowerCase(), { word: word.toLowerCase(), addedAt: Date.now() }); }
  removeBlockedWord(word: string): void { this.blockedWords.delete(word.toLowerCase()); }
  getBlockedWords(): BlockedWord[] { return Array.from(this.blockedWords.values()); }
  containsBlockedWord(text: string): boolean { return Array.from(this.blockedWords.keys()).some(word => text.toLowerCase().includes(word)); }

  // ---------------------------
  // Typing
  // ---------------------------
  setUserTyping(username: string): void { this.typingUsers.set(username, Date.now()); }
  removeUserTyping(username: string): void { this.typingUsers.delete(username); }
  getTypingUsers(): string[] {
    const now = Date.now();
    const active: string[] = [];
    this.typingUsers.forEach((ts, username) => {
      if (now - ts < 5000) active.push(username);
      else this.typingUsers.delete(username);
    });
    return active;
  }
}

// ---------------------------
// Export instance
// ---------------------------
export const storage = new GitHubStorage();
