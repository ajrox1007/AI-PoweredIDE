import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertAiCompletionSchema, insertAiChatSchema, ChatMessage } from "../shared/schema";
import * as openAI from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to check if OpenAI API key is available
  const checkApiKey = (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key is not configured. Please add it to the environment variables.',
        missingKey: true
      });
    }
    next();
  };

  // API routes for AI functionality
  app.post('/api/ai/complete', checkApiKey, async (req, res) => {
    try {
      const { code, position } = req.body;
      
      // Get completions from OpenAI
      const suggestions = await openAI.getCompletions(code, position);
      
      // Store the completion in the database (if we have a fileId)
      if (req.body.fileId) {
        try {
          const completionData = {
            query: JSON.stringify({ code, position }),
            response: JSON.stringify(suggestions),
            fileId: parseInt(req.body.fileId),
            userId: 1, // Default user
            createdAt: new Date().toISOString()
          };
          
          await storage.createAiCompletion(completionData);
        } catch (err) {
          console.error('Failed to store completion:', err);
          // Continue anyway, this is just logging
        }
      }
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Error completing code:', error);
      res.status(500).json({ error: 'Failed to get completions' });
    }
  });
  
  app.post('/api/ai/chat', checkApiKey, async (req, res) => {
    try {
      const schema = z.object({
        message: z.string(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string(),
          timestamp: z.number()
        })).optional(),
        fileId: z.string().optional()
      });
      
      const validated = schema.parse(req.body);
      
      // Get AI response
      const history = validated.history || [];
      const response = await openAI.chatWithAI(validated.message, history);
      
      // Create updated history with new messages
      const updatedHistory: ChatMessage[] = [
        ...history,
        {
          role: 'user',
          content: validated.message,
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        }
      ];
      
      // Log the chat in the database
      if (validated.fileId) {
        const chatData = {
          conversation: JSON.stringify(updatedHistory),
          fileId: parseInt(validated.fileId),
          userId: 1, // Default user
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Store the chat
        try {
          await storage.createAiChat(chatData);
        } catch (err) {
          console.error('Failed to store chat:', err);
          // Continue anyway, this is just logging
        }
      }
      
      res.json({ response, history: updatedHistory });
    } catch (error) {
      console.error('Error in AI chat:', error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  });
  
  app.post('/api/ai/generate-tests', checkApiKey, async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'No code provided' });
      }
      
      const tests = await openAI.generateTests(code, language || 'javascript');
      res.json({ tests });
    } catch (error) {
      console.error('Error generating tests:', error);
      res.status(500).json({ error: 'Failed to generate tests' });
    }
  });
  
  app.post('/api/ai/explain-code', checkApiKey, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'No code provided' });
      }
      
      const explanation = await openAI.explainCode(code);
      res.json({ explanation });
    } catch (error) {
      console.error('Error explaining code:', error);
      res.status(500).json({ error: 'Failed to explain code' });
    }
  });
  
  app.post('/api/ai/refactor-code', checkApiKey, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'No code provided' });
      }
      
      const refactored = await openAI.refactorCode(code);
      res.json({ refactored });
    } catch (error) {
      console.error('Error refactoring code:', error);
      res.status(500).json({ error: 'Failed to refactor code' });
    }
  });
  
  app.post('/api/ai/find-bugs', checkApiKey, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'No code provided' });
      }
      
      const bugReport = await openAI.findBugsInCode(code);
      res.json({ bugReport });
    } catch (error) {
      console.error('Error finding bugs:', error);
      res.status(500).json({ error: 'Failed to find bugs' });
    }
  });
  
  // Terminal routes - We'll keep these as simulated for now
  app.post('/api/terminal/execute', (req, res) => {
    const { command } = req.body;
    
    // Simulate terminal output based on commands
    let output = '';
    
    if (command.startsWith('ls')) {
      output = 'index.js\npackage.json\nnode_modules/\nREADME.md\nsrc/';
    } else if (command.startsWith('pwd')) {
      output = '/home/user/project';
    } else if (command.startsWith('echo')) {
      output = command.substring(5);
    } else if (command.startsWith('cat')) {
      output = 'File contents would be displayed here';
    } else if (command === 'help') {
      output = 'Available commands: ls, pwd, echo, cat, help, clear';
    } else if (command.trim() !== '') {
      output = `Command not found: ${command}`;
    }
    
    res.json({ output });
  });
  
  app.get('/api/terminal/history', (req, res) => {
    // Return mock command history
    res.json({
      history: [
        'npm install',
        'ls',
        'node index.js',
        'git status'
      ]
    });
  });
  
  app.post('/api/terminal/clear-history', (req, res) => {
    // Clear command history (mock)
    res.json({ success: true });
  });

  const httpServer = createServer(app);

  return httpServer;
}
