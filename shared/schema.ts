import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { Change } from 'diff'; // Import the diff Change type

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const aiCompletions = pgTable("ai_completions", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  fileId: integer("file_id").references(() => files.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const aiChats = pgTable("ai_chats", {
  id: serial("id").primaryKey(),
  conversation: jsonb("conversation").notNull(),
  fileId: integer("file_id").references(() => files.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  path: true,
  content: true,
  language: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiCompletionSchema = createInsertSchema(aiCompletions).pick({
  query: true,
  response: true,
  fileId: true,
  userId: true,
  createdAt: true,
});

export const insertAiChatSchema = createInsertSchema(aiChats).pick({
  conversation: true,
  fileId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertAiCompletion = z.infer<typeof insertAiCompletionSchema>;
export type AiCompletion = typeof aiCompletions.$inferSelect;

export type InsertAiChat = z.infer<typeof insertAiChatSchema>;
export type AiChat = typeof aiChats.$inferSelect;

// Type for modify_code intent object
export type ModifyCodeIntent = {
  intent: 'modify_code';
  prompt: string;
}

// Chat message type for frontend
export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  // Content can be a simple string or the structured intent object
  content: string | ModifyCodeIntent; 
  timestamp: number;
  diff?: Change[]; // Add optional diff property
};

// File type for frontend file system
export type FileNode = {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
};
