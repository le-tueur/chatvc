import type {
  User,
  Message,
  ChatConfig,
  MutedUser,
  BlockedWord,
} from "@shared/schema";
import { IStorage } from "./storage";

interface GitHubStorageData {
  users: Array<{
    id: string;
    username: string;
    role: string;
    isOnline: boolean;
    isMuted: boolean;
    mutedUntil?: number;
    isHidden: boolean;
  }>;
  messages: Message[];
  mutedUsers: MutedUser[];
  blockedWords: BlockedWord[];
  config: ChatConfig;
}

const GITHUB_REPO = "le-tueur/chatvc";
const GITHUB_BRANCH = "main";
const GITHUB_STORAGE_FILE = "chat-storage.json";
const GITHUB_API_BASE = "https://api.github.com";

export class GitHubStorage implements IStorage {
  users: Map<string, User>;
  messages: Message[];
  config: ChatConfig;
  mutedUsers: Map<string, MutedUser>;
  blockedWords: Map<string, BlockedWord>;
  typingUsers: Map<string, number>;
  
  private githubToken: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private currentSha: string | null = null;
  private isInitialized: boolean = false;

  constructor(githubToken: string) {
    this.githubToken = githubToken;
    this.users = new Map();
    this.messages = [];
    this.config = {
      enabled: true,
      cooldown: 0,
      simulationMode: false,
      directChatEnabled: false,
    };
    this.mutedUsers = new Map();
    this.blockedWords = new Map();
    this.typingUsers = new Map();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.loadFromGitHub();
      this.isInitialized = true;
      console.log("✅ GitHub storage initialized successfully");
    } catch (error) {
      console.error("⚠️ Failed to load from GitHub, starting fresh:", error);
      this.isInitialized = true;
    }
  }

  private async loadFromGitHub(): Promise<void> {
    try {
      const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${GITHUB_STORAGE_FILE}?ref=${GITHUB_BRANCH}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.status === 404) {
        console.log("📝 No existing storage file found, will create on first save");
        return;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.currentSha = data.sha;

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const storageData: GitHubStorageData = JSON.parse(content);

      // Load users (but don't persist them - they're session-based)
      this.users = new Map();

      // Load messages
      this.messages = storageData.messages || [];

      // Load config with defaults for new fields
      const loadedConfig = storageData.config || {};
      this.config = {
        enabled: loadedConfig.enabled ?? true,
        cooldown: loadedConfig.cooldown ?? 0,
        simulationMode: loadedConfig.simulationMode ?? false,
        directChatEnabled: loadedConfig.directChatEnabled ?? false,
        timerEndTime: loadedConfig.timerEndTime,
      };

      // Load muted users
      this.mutedUsers = new Map();
      (storageData.mutedUsers || []).forEach((mu) => {
        this.mutedUsers.set(mu.username, mu);
      });

      // Load blocked words
      this.blockedWords = new Map();
      (storageData.blockedWords || []).forEach((bw) => {
        this.blockedWords.set(bw.word, bw);
      });

      console.log(`📥 Loaded ${this.messages.length} messages from GitHub`);
    } catch (error) {
      console.error("Error loading from GitHub:", error);
      throw error;
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveToGitHub().catch((error) => {
        console.error("Failed to save to GitHub:", error);
      });
    }, 2000); // Debounce saves by 2 seconds
  }

  async saveToGitHub(): Promise<void> {
    try {
      const storageData: GitHubStorageData = {
        users: [], // Don't persist session users
        messages: this.messages,
        mutedUsers: Array.from(this.mutedUsers.values()),
        blockedWords: Array.from(this.blockedWords.values()),
        config: this.config,
      };

      const content = JSON.stringify(storageData, null, 2);
      const encodedContent = Buffer.from(content).toString("base64");

      const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${GITHUB_STORAGE_FILE}`;
      const body: any = {
        message: `Update chat storage - ${new Date().toISOString()}`,
        content: encodedContent,
        branch: GITHUB_BRANCH,
      };

      if (this.currentSha) {
        body.sha = this.currentSha;
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.currentSha = data.content.sha;

      console.log("💾 Saved to GitHub successfully");
    } catch (error) {
      console.error("Error saving to GitHub:", error);
      throw error;
    }
  }

  // User methods
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
    // Don't save to GitHub - users are session-based
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

  // Message methods
  addMessage(message: Message): void {
    this.messages.push(message);
    this.scheduleSave();
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
      this.scheduleSave();
    }
  }

  deleteMessage(messageId: string): void {
    this.messages = this.messages.filter((m) => m.id !== messageId);
    this.scheduleSave();
  }

  clearMessages(): void {
    this.messages = [];
    this.scheduleSave();
  }

  // Config methods
  getConfig(): ChatConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...updates };
    this.scheduleSave();
  }

  // Muted users methods
  addMutedUser(mutedUser: MutedUser): void {
    this.mutedUsers.set(mutedUser.username, mutedUser);
    const user = this.getUserByUsername(mutedUser.username);
    if (user) {
      this.updateUser(user.id, {
        isMuted: true,
        mutedUntil: mutedUser.mutedUntil,
      });
    }
    this.scheduleSave();
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
    this.scheduleSave();
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

  // Blocked words methods
  addBlockedWord(word: string): void {
    this.blockedWords.set(word.toLowerCase(), {
      word: word.toLowerCase(),
      addedAt: Date.now(),
    });
    this.scheduleSave();
  }

  removeBlockedWord(word: string): void {
    this.blockedWords.delete(word.toLowerCase());
    this.scheduleSave();
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

  // Typing users methods (not persisted)
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

  // Export methods
  async getStorageDataForExport(): Promise<GitHubStorageData> {
    return {
      users: Array.from(this.users.values()).map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        isOnline: u.isOnline,
        isMuted: u.isMuted,
        mutedUntil: u.mutedUntil,
        isHidden: u.isHidden,
      })),
      messages: this.messages,
      mutedUsers: Array.from(this.mutedUsers.values()),
      blockedWords: Array.from(this.blockedWords.values()),
      config: this.config,
    };
  }
}
