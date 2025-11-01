import { z } from "zod";

export type UserRole = "ad" | "shainez" | "gnoir";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  isOnline: boolean;
  isMuted: boolean;
  mutedUntil?: number;
  isHidden: boolean;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  content: string;
  timestamp: number;
  status: "pending" | "approved" | "rejected";
  type: "normal" | "event" | "flash";
  forcePublished?: boolean;
  flashDuration?: number;
}

export interface ChatConfig {
  enabled: boolean;
  cooldown: number;
  timerEndTime?: number;
  simulationMode: boolean;
}

export interface MutedUser {
  username: string;
  mutedUntil: number;
}

export interface BlockedWord {
  word: string;
  addedAt: number;
}

export interface TypingUser {
  username: string;
  timestamp: number;
}

export const loginSchema = z.object({
  username: z.enum(["ad", "shainez", "gnoir"]),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const eventMessageSchema = z.object({
  content: z.string().min(1).max(500),
});

export const flashMessageSchema = z.object({
  content: z.string().min(1).max(500),
  duration: z.number().min(1).max(60),
});

export const muteUserSchema = z.object({
  username: z.string(),
  duration: z.number().min(1),
});

export const blockWordSchema = z.object({
  word: z.string().min(1),
});

export const chatConfigSchema = z.object({
  enabled: z.boolean().optional(),
  cooldown: z.number().min(0).optional(),
  timerMinutes: z.number().min(0).optional(),
});
