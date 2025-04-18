import { users, type User, type InsertUser, files, type File, type InsertFile, aiCompletions, type AiCompletion, type InsertAiCompletion, aiChats, type AiChat, type InsertAiChat } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File methods
  getFile(id: number): Promise<File | undefined>;
  getFilesByUserId(userId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // AI Completion methods
  createAiCompletion(completion: InsertAiCompletion): Promise<AiCompletion>;
  getCompletionsByFileId(fileId: number): Promise<AiCompletion[]>;
  
  // AI Chat methods
  createAiChat(chat: InsertAiChat): Promise<AiChat>;
  getChatsByFileId(fileId: number): Promise<AiChat[]>;
  updateAiChat(id: number, updates: Partial<InsertAiChat>): Promise<AiChat | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private aiCompletions: Map<number, AiCompletion>;
  private aiChats: Map<number, AiChat>;
  private userCurrentId: number;
  private fileCurrentId: number;
  private aiCompletionCurrentId: number;
  private aiChatCurrentId: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.aiCompletions = new Map();
    this.aiChats = new Map();
    this.userCurrentId = 1;
    this.fileCurrentId = 1;
    this.aiCompletionCurrentId = 1;
    this.aiChatCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // File methods
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }
  
  async getFilesByUserId(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId
    );
  }
  
  async createFile(file: InsertFile): Promise<File> {
    const id = this.fileCurrentId++;
    // Set default values for optional properties to avoid type issues
    const newFile: File = { 
      ...file, 
      id,
      userId: file.userId ?? null
    };
    this.files.set(id, newFile);
    return newFile;
  }
  
  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File | undefined> {
    const file = await this.getFile(id);
    if (!file) return undefined;
    
    const updatedFile: File = { 
      ...file, 
      ...updates,
      userId: updates.userId ?? file.userId 
    };
    this.files.set(id, updatedFile);
    return updatedFile;
  }
  
  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }
  
  // AI Completion methods
  async createAiCompletion(completion: InsertAiCompletion): Promise<AiCompletion> {
    const id = this.aiCompletionCurrentId++;
    const newCompletion: AiCompletion = { 
      ...completion, 
      id,
      userId: completion.userId ?? null,
      fileId: completion.fileId ?? null
    };
    this.aiCompletions.set(id, newCompletion);
    return newCompletion;
  }
  
  async getCompletionsByFileId(fileId: number): Promise<AiCompletion[]> {
    return Array.from(this.aiCompletions.values()).filter(
      (completion) => completion.fileId === fileId
    );
  }
  
  // AI Chat methods
  async createAiChat(chat: InsertAiChat): Promise<AiChat> {
    const id = this.aiChatCurrentId++;
    const newChat: AiChat = { 
      ...chat, 
      id,
      userId: chat.userId ?? null,
      fileId: chat.fileId ?? null
    };
    this.aiChats.set(id, newChat);
    return newChat;
  }
  
  async getChatsByFileId(fileId: number): Promise<AiChat[]> {
    return Array.from(this.aiChats.values()).filter(
      (chat) => chat.fileId === fileId
    );
  }
  
  async updateAiChat(id: number, updates: Partial<InsertAiChat>): Promise<AiChat | undefined> {
    const chat = this.aiChats.get(id);
    if (!chat) return undefined;
    
    const updatedChat: AiChat = { 
      ...chat, 
      ...updates,
      userId: updates.userId ?? chat.userId,
      fileId: updates.fileId ?? chat.fileId
    };
    this.aiChats.set(id, updatedChat);
    return updatedChat;
  }
}

export const storage = new MemStorage();
