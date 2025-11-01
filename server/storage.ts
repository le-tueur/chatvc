import fs from "fs";
import path from "path";
import type { User, Message, ChatConfig, MutedUser, BlockedWord } from "@shared/schema";

const FILE_PATH = path.join(__dirname, "chat.json");

function readStorage() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      users: [],
      messages: [],
      mutedUsers: [],
      blockedWords: [],
      config: { enabled: true, cooldown: 0, simulationMode: false },
    };
  }
}

function writeStorage(data: any) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export class FileStorage {
  private data: {
    users: User[];
    messages: Message[];
    mutedUsers: MutedUser[];
    blockedWords: BlockedWord[];
    config: ChatConfig;
  };

  constructor() {
    this.data = readStorage();
  }

  // ------------------
  // Users
  // ------------------
  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username === username);
  }

  addUser(user: User) {
    this.data.users.push(user);
    writeStorage(this.data);
  }

  removeUser(userId: string) {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    writeStorage(this.data);
  }

  updateUser(userId: string, updates: Partial<User>) {
    const user = this.getUserById(userId);
    if (user) {
      Object.assign(user, updates);
      writeStorage(this.data);
    }
  }

  // ------------------
  // Messages
  // ------------------
  getMessages(): Message[] {
    return this.data.messages;
  }

  getPendingMessages(): Message[] {
    return this.data.messages.filter(m => m.status === "pending" && m.type === "normal");
  }

  getApprovedMessages(): Message[] {
    return this.data.messages.filter(
      m => m.status === "approved" || m.type === "event" || m.type === "flash" || m.forcePublished
    );
  }

  addMessage(message: Message) {
    this.data.messages.push(message);
    writeStorage(this.data);
  }

  updateMessage(messageId: string, updates: Partial<Message>) {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (msg) {
      Object.assign(msg, updates);
      writeStorage(this.data);
    }
  }

  deleteMessage(messageId: string) {
    this.data.messages = this.data.messages.filter(m => m.id !== messageId);
    writeStorage(this.data);
  }

  clearMessages() {
    this.data.messages = [];
    writeStorage(this.data);
  }

  // ------------------
  // Config
  // ------------------
  getConfig(): ChatConfig {
    return this.data.config;
  }

  updateConfig(updates: Partial<ChatConfig>) {
    Object.assign(this.data.config, updates);
    writeStorage(this.data);
  }

  // ------------------
  // Muted Users
  // ------------------
  addMutedUser(mutedUser: MutedUser) {
    this.data.mutedUsers.push(mutedUser);
    const user = this.getUserByUsername(mutedUser.username);
    if (user) {
      user.isMuted = true;
      user.mutedUntil = mutedUser.mutedUntil;
    }
    writeStorage(this.data);
  }

  removeMutedUser(username: string) {
    this.data.mutedUsers = this.data.mutedUsers.filter(mu => mu.username !== username);
    const user = this.getUserByUsername(username);
    if (user) {
      user.isMuted = false;
      user.mutedUntil = undefined;
    }
    writeStorage(this.data);
  }

  getMutedUsers(): MutedUser[] {
    const now = Date.now();
    const active = this.data.mutedUsers.filter(mu => mu.mutedUntil > now);
    const expired = this.data.mutedUsers.filter(mu => mu.mutedUntil <= now);
    expired.forEach(mu => this.removeMutedUser(mu.username));
    return active;
  }

  isUserMuted(username: string): boolean {
    const muted = this.data.mutedUsers.find(mu => mu.username === username);
    if (!muted) return false;
    if (muted.mutedUntil <= Date.now()) {
      this.removeMutedUser(username);
      return false;
    }
    return true;
  }

  // ------------------
  // Blocked Words
  // ------------------
  addBlockedWord(word: string) {
    if (!this.data.blockedWords.find(w => w.word === word.toLowerCase())) {
      this.data.blockedWords.push({ word: word.toLowerCase(), addedAt: Date.now() });
      writeStorage(this.data);
    }
  }

  removeBlockedWord(word: string) {
    this.data.blockedWords = this.data.blockedWords.filter(w => w.word !== word.toLowerCase());
    writeStorage(this.data);
  }

  getBlockedWords(): BlockedWord[] {
    return this.data.blockedWords;
  }

  containsBlockedWord(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.data.blockedWords.some(w => lowerText.includes(w.word));
  }

  // ------------------
  // Typing Users
  // ------------------
  private typingUsers: Map<string, number> = new Map();

  setUserTyping(username: string) {
    this.typingUsers.set(username, Date.now());
  }

  removeUserTyping(username: string) {
    this.typingUsers.delete(username);
  }

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

export const storage = new FileStorage();
