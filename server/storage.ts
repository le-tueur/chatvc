// storage.ts
import axios from "axios";
import type { User, Message, ChatConfig, MutedUser, BlockedWord } from "@shared/schema";
import { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } from "./config";

if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN non défini dans config.ts");

// Axios instance pour GitHub API
const axiosInstance = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

const FILE_PATH = "chat-storage.json";

// Fonction pour charger le fichier JSON depuis GitHub
async function loadStorage(): Promise<any> {
  try {
    const res = await axiosInstance.get(`/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
    const content = Buffer.from(res.data.content, "base64").toString("utf-8");
    return JSON.parse(content);
  } catch (err: any) {
    if (err.response?.status === 404) return {}; // fichier inexistant
    throw err;
  }
}

// Fonction pour sauvegarder le JSON dans GitHub
async function saveStorage(updates: any) {
  const currentData = await loadStorage();
  const newData = { ...currentData, ...updates };
  const contentBase64 = Buffer.from(JSON.stringify(newData, null, 2)).toString("base64");

  // Récupérer le SHA si le fichier existe
  let sha;
  try {
    const res = await axiosInstance.get(`/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
    sha = res.data.sha;
  } catch {}

  await axiosInstance.put(`/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
    message: "Mise à jour chat-storage.json",
    content: contentBase64,
    sha,
    branch: GITHUB_BRANCH,
  });
}

// Storage complet
export class GitHubStorage {
  users: Map<string, User> = new Map();
  messages: Message[] = [];
  config: ChatConfig = { enabled: true, cooldown: 0, simulationMode: false };
  mutedUsers: Map<string, MutedUser> = new Map();
  blockedWords: Map<string, BlockedWord> = new Map();
  typingUsers: Map<string, number> = new Map();

  constructor() {
    this.init();
  }

  async init() {
    const data = await loadStorage();
    this.messages = data.messages || [];
    this.config = data.config || this.config;
    this.mutedUsers = new Map((data.mutedUsers || []).map((mu: MutedUser) => [mu.username, mu]));
    this.blockedWords = new Map((data.blockedWords || []).map((bw: BlockedWord) => [bw.word, bw]));
    this.users = new Map((data.users || []).map((u: User) => [u.id, u]));
  }

  // Users
  getUserById(id: string): User | undefined { return this.users.get(id); }
  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  addUser(user: User) { this.users.set(user.id, user); }
  removeUser(userId: string) { this.users.delete(userId); }
  updateUser(userId: string, updates: Partial<User>) {
    const user = this.users.get(userId);
    if (user) this.users.set(userId, { ...user, ...updates });
  }

  // Messages
  async addMessage(message: Message) {
    this.messages.push(message);
    await saveStorage({ messages: this.messages });
  }

  getMessages() { return this.messages; }
  getPendingMessages() { return this.messages.filter(m => m.status === "pending" && m.type === "normal"); }
  getApprovedMessages() { return this.messages.filter(m => m.status === "approved" || m.type !== "normal" || m.forcePublished); }

  async updateMessage(messageId: string, updates: Partial<Message>) {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.messages[index] = { ...this.messages[index], ...updates };
      await saveStorage({ messages: this.messages });
    }
  }

  async deleteMessage(messageId: string) {
    this.messages = this.messages.filter(m => m.id !== messageId);
    await saveStorage({ messages: this.messages });
  }

  async clearMessages() {
    this.messages = [];
    await saveStorage({ messages: [] });
  }

  // Config
  getConfig() { return this.config; }
  async updateConfig(updates: Partial<ChatConfig>) {
    this.config = { ...this.config, ...updates };
    await saveStorage({ config: this.config });
  }

  // Muted Users
  addMutedUser(mutedUser: MutedUser) {
    this.mutedUsers.set(mutedUser.username, mutedUser);
    const user = this.getUserByUsername(mutedUser.username);
    if (user) this.updateUser(user.id, { isMuted: true, mutedUntil: mutedUser.mutedUntil });
    saveStorage({ mutedUsers: Array.from(this.mutedUsers.values()) });
  }

  removeMutedUser(username: string) {
    this.mutedUsers.delete(username);
    const user = this.getUserByUsername(username);
    if (user) this.updateUser(user.id, { isMuted: false, mutedUntil: undefined });
    saveStorage({ mutedUsers: Array.from(this.mutedUsers.values()) });
  }

  getMutedUsers(): MutedUser[] {
    const now = Date.now();
    const active = Array.from(this.mutedUsers.values()).filter(mu => mu.mutedUntil > now);
    const expired = Array.from(this.mutedUsers.values()).filter(mu => mu.mutedUntil <= now);
    expired.forEach(mu => this.removeMutedUser(mu.username));
    return active;
  }

  isUserMuted(username: string) {
    const muted = this.mutedUsers.get(username);
    if (!muted) return false;
    if (muted.mutedUntil <= Date.now()) {
      this.removeMutedUser(username);
      return false;
    }
    return true;
  }

  // Blocked Words
  addBlockedWord(word: string) {
    this.blockedWords.set(word.toLowerCase(), { word: word.toLowerCase(), addedAt: Date.now() });
    saveStorage({ blockedWords: Array.from(this.blockedWords.values()) });
  }
  removeBlockedWord(word: string) {
    this.blockedWords.delete(word.toLowerCase());
    saveStorage({ blockedWords: Array.from(this.blockedWords.values()) });
  }
  getBlockedWords() { return Array.from(this.blockedWords.values()); }
  containsBlockedWord(text: string) {
    const lowerText = text.toLowerCase();
    return Array.from(this.blockedWords.keys()).some(word => lowerText.includes(word));
  }

  // Typing Users
  setUserTyping(username: string) { this.typingUsers.set(username, Date.now()); }
  removeUserTyping(username: string) { this.typingUsers.delete(username); }
  getTypingUsers(): string[] {
    const now = Date.now();
    const active: string[] = [];
    Array.from(this.typingUsers.entries()).forEach(([username, timestamp]) => {
      if (now - timestamp < 5000) active.push(username);
      else this.typingUsers.delete(username);
    });
    return active;
  }
}

export const storage = new GitHubStorage();
