import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertAiCompletionSchema, insertAiChatSchema, ChatMessage, ModifyCodeIntent } from "../shared/schema";
import * as openAI from "./openai";

// Define the NEW detailed user prompt for complex, self-contained problem generation
const DEBUGGING_PROBLEM_PROMPT = `# Prompt for Generating Ultra-Complex, Self-Contained Python Debugging Problems for AI/ML Engineers\n\n## Context\nYou are creating extremely challenging debugging problems for expert-level AI/ML engineers. These problems must be **fully self-contained and executable locally** without external APIs or internet access, testing advanced Python proficiency, expert-level understanding of machine learning theory, library internals, and intricate implementation pitfalls across multiple interconnected systems.\n\n## Core Requirements\n1.  **Self-Contained & Local Execution**: Problems MUST run entirely locally. Provide all necessary components.\n    *   **No External Dependencies**: No external APIs, cloud services, or authenticated resources.\n    *   **Libraries**: Use only common open-source libraries (PyTorch, TensorFlow, scikit-learn, JAX, NumPy, Pandas, etc.).\n    *   **Dependencies**: Include a list of necessary libraries and versions (like a requirements.txt content) within the README.\n    *   **Setup**: Include clear, step-by-step setup instructions in the README (e.g., \"Run pip install -r requirements.txt\", \"Run python generate_data.py\").\n    *   **Data**: Include Python code to generate necessary synthetic data within the main buggy script or as a separate utility function described in the README.\n    *   **Execution**: Specify exact commands in the README to run the buggy code/system.\n    *   **Resources**: Ensure the problem can run on a standard laptop (e.g., 16GB RAM, 4 cores, CPU/GPU) in under 10 minutes.\n2.  **Ultra-Complex Problems**: Target expert engineers.\n    *   **Bugs**: Include 6-10 non-trivial, interrelated bugs creating compound effects.\n    *   **Tiered Difficulty**: Include surface, mid-level, and root-cause bugs.\n    *   **Multi-system Complexity**: Bugs should span logic, libraries, performance, data, ML concepts.\n    *   **Red Herrings**: Include plausible but misleading clues in logs or outputs (describe these in the README).\n3.  **Realistic Scenario**: Frame the problem within a high-pressure production context.\n\n## Output Format\nRespond ONLY with a JSON object containing two keys: \"pythonCode\" and \"readmeContent\". Do NOT include any other text, explanations, or markdown formatting outside this JSON structure.\n\n## Content for \"pythonCode\" (String)\n*   Include 100-200 lines of buggy Python code.\n*   The code should contain the 6-10 interacting bugs.\n*   If data generation is needed, include the generation function within this code or clearly state in the README how to run a separate (hypothetical) generator script.\n*   Implement necessary mock functions if the scenario implies external services, ensuring they run locally.\n*   Ensure code includes imports matching the dependencies listed in the README.\n\n## Content for \"readmeContent\" (String - Markdown Format)\nStructure the markdown string precisely as follows:\n\n# Problem Title: [Descriptive Title]\n\n## Scenario\n[Detailed, realistic scenario, ~100 words, high-pressure context.]\n\n## System Architecture Overview\n[Describe key components, interactions, frameworks used (PyTorch, TF, etc.), and data flow. ~100 words]\n\n## Dependencies\n\`\`\`text\n# Example requirements.txt content\npython>=3.8\ntorch==1.10.0\nnumpy==1.21.0\n# Add all other necessary libraries with versions\n\`\`\`\n\n## Setup Instructions\n1.  Save the Python code below as \`problem.py\`. \n2.  Create a file named \`requirements.txt\` with the content listed under Dependencies.\n3.  Install dependencies: \`pip install -r requirements.txt\`\n4.  (If applicable) Generate data: \`python problem.py --generate-data\` or similar (ensure the code supports this).\n5.  Run the main script: \`python problem.py\`\n\n## Observed Issues / Misleading Logs\n[Describe the specific errors, incorrect outputs, performance issues, and any red herring logs observed when running the buggy code. Be specific.]\n\n## Expected Correct Behavior\n[Clear description of how the system *should* behave when fixed, with specific metrics or outputs.]\n\n## Debugging Challenge Questions\n[Include 3-5 challenging questions based on the sample questions provided below, tailored to the specific problem.]\n\n### Sample Questions Pool (Select and adapt 3-5 for the specific problem):\n1.  \"What would happen if you fixed bug X but not bug Y? Explain the cascade of effects.\"\n2.  \"How might the interaction between library A and library B contribute to the observed memory leak?\"\n3.  \"If you only had access to the described logs/outputs (not code), what monitoring would you add to isolate the core issue?\"\n4.  \"What theoretical ML concept (e.g., gradient flow, data distribution assumptions) is being violated by this implementation?\"\n5.  \"Which components of this system are most vulnerable to subtle changes in input data distribution (data drift), and why?\"\n6.  \"How would you design a minimal synthetic test case that reliably reproduces the race condition (or other specific bug)?\"\n7.  \"If you could refactor only 20% of this system for stability, which parts would you choose and why?\"\n8.  \"What single metric (or combination of metrics) would best detect this class of issues in a production monitoring setup?\"\n\n## Bug Types to Include (Ensure 6-10 interacting bugs from multiple categories)\n*   Logic (Off-by-one, Race conditions, Edge cases, Contradictions, Time-dependent)\n*   Library-Specific (API quirks, Version compatibility, Advanced features, Thread safety)\n*   Performance/System (Memory leaks, Resource contention, Cache issues, GPU fragmentation, Compiler issues)\n*   Data Pipeline (Leakage, Timestamp issues, Inconsistent processing, Stateful transforms, Corrupted data)\n*   ML-Specific (Numerical instability, Architecture flaws, Catastrophic forgetting, Loss function errors, Mixed precision issues)\n\n## Problem Domains to Cover (Combine multiple domains ideally)\n*   Model & Algorithm (Multi-modal, Hybrid, Transfer, SSL, Meta, Generative, RL, Federated)\n*   Infrastructure & Scale (Distributed Training, Heterogeneous GPUs, Edge, HFT, Petabyte Data, Real-time Serving)\n*   Production Contexts (Regulated Industries, Multi-tenant, Interpretability, Continual Learning, A/B Testing, Monitoring, Privacy/Security)`;

// Updated Problem Generation Logic using OpenAI
async function generateProblemFiles(): Promise<{ pythonCode: string, readmeContent: string }> {
    console.log("Calling OpenAI to generate problem files...");
    // Call the new function from openai.ts with the defined prompt
    return await openAI.generateDebuggingProblem(DEBUGGING_PROBLEM_PROMPT);
}

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
      // Define schema for chat message content (string or ModifyCodeIntent)
      const contentSchema = z.union([
        z.string(),
        z.object({
          intent: z.literal('modify_code'), // Use literal for exact match
          prompt: z.string()
        })
      ]);
      
      // Define schema for a single ChatMessage
      const chatMessageSchema = z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: contentSchema,
        timestamp: z.number()
      });

      const schema = z.object({
        message: z.string(),
        history: z.array(chatMessageSchema).optional(), // Use the detailed schema here
        fileId: z.string().optional()
      });
      
      const validated = schema.parse(req.body);
      
      const history = (validated.history || []) as ChatMessage[]; // Assert type after validation
      const aiResult = await openAI.chatWithAI(validated.message, history);
      
      if (typeof aiResult === 'object' && aiResult.intent === 'modify_code') {
        // Ensure the response matches ModifyCodeIntent shape for type safety
        const intentResponse: ModifyCodeIntent = { 
            intent: 'modify_code', 
            prompt: aiResult.prompt 
        };
        res.json({ response: intentResponse }); 
        return;
      }
      
      const responseString = typeof aiResult === 'string' ? aiResult : 'An unexpected error occurred.';
      
      // Create updated history using validated types
      const updatedHistory: ChatMessage[] = [
        ...history,
        { 
          role: 'user', 
          content: validated.message, // content is definitely string here
          timestamp: Date.now() 
        },
        { 
          role: 'assistant', 
          content: responseString, // content is definitely string here
          timestamp: Date.now() 
        }
      ];
      
      // Log the chat in the database (only log string responses for now)
      if (validated.fileId) {
        const chatData = {
          conversation: JSON.stringify(updatedHistory),
          fileId: parseInt(validated.fileId),
          userId: 1, // Default user
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        try {
          await storage.createAiChat(chatData);
        } catch (err) {
          console.error('Failed to store chat:', err);
        }
      }
      
      res.json({ response: responseString, history: updatedHistory });

    } catch (error) {
      console.error('Error in AI chat:', error);
      // Ensure error response matches the expected content type (string in this case)
      const errorMessage = error instanceof Error ? error.message : 'Failed to get AI response';
      res.status(500).json({ response: `Error: ${errorMessage}` }); 
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
      const { code, prompt, language } = req.body;
      
      // Allow empty string for code, but prompt is required
      if (typeof code !== 'string' || !prompt) { 
        console.error(`Refactor request missing code (type: ${typeof code}) or prompt (present: ${!!prompt})`);
        return res.status(400).json({ error: 'Code (string) and prompt (string) are required' });
      }
      
      // Call the streaming function, passing the response object
      await openAI.refactorCode(code, prompt, res, language);
      
      // DO NOT call res.json() or res.send() here - the connection is handled by refactorCode

    } catch (error: any) {
      // If an error occurs *before* streaming starts (e.g., in request validation)
      // or if refactorCode itself throws synchronously (shouldn't happen with try/catch inside)
      console.error('Error setting up refactor code stream:', error);
      // Avoid sending JSON if headers might have been sent by refactorCode before erroring
      if (!res.headersSent) {
         res.status(500).json({ error: error.message || 'Failed to initiate refactor stream' });
      } else {
         // If headers were sent, we can only try to end the response
         res.end();
      }
    }
  });
  
  app.post('/api/ai/find-bugs', checkApiKey, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'No code provided' });
      }
      
      const bugReport = await openAI.findBugsInCode(code);
      // Check for API key error specifically
      if (bugReport.includes('API key')) {
         return res.status(401).json({ error: bugReport, missingKey: true });
      }
      res.json({ bugReport });
    } catch (error) {
      console.error('Error finding bugs:', error);
      res.status(500).json({ error: 'Failed to find bugs' });
    }
  });
  
  // NEW Route: Fix Code Snippet
  app.post('/api/ai/fix-snippet', checkApiKey, async (req, res) => {
    try {
      const { prompt, snippet, language } = req.body;
      
      // Validate input
      if (typeof prompt !== 'string' || typeof snippet !== 'string') {
        console.error('Fix snippet request missing prompt or snippet string.');
        return res.status(400).json({ error: 'Prompt (string) and snippet (string) are required' });
      }
      if (!prompt || !snippet) {
         console.error('Fix snippet request has empty prompt or snippet.');
         return res.status(400).json({ error: 'Prompt and snippet cannot be empty' });
      }

      // Call the new OpenAI service function (to be created)
      const modifiedSnippet = await openAI.fixSnippet(prompt, snippet, language);
      
      // Check if the service function returned an error string
      if (modifiedSnippet.startsWith('Error:')) {
         console.error('Error from openAI.fixSnippet:', modifiedSnippet);
         // Simple heuristic: if it contains "API key", return 401, else 500
         const statusCode = modifiedSnippet.includes('API key') ? 401 : 500;
         // Include missingKey flag for frontend handling
         const errorPayload: { error: string; missingKey?: boolean } = { error: modifiedSnippet };
         if (statusCode === 401) {
            errorPayload.missingKey = true;
         }
         return res.status(statusCode).json(errorPayload);
      }

      // Send the modified snippet back
      res.json({ modifiedSnippet });

    } catch (error: any) {
      console.error('Error in /api/ai/fix-snippet route:', error);
      res.status(500).json({ error: error.message || 'Failed to process code snippet fix request' });
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

  // --- Modified Route for Problem Generation (Now Async) ---
  app.post('/api/generate-problem', checkApiKey, async (req, res) => {
    try {
        const { pythonCode, readmeContent } = await generateProblemFiles();
        res.json({ pythonCode, readmeContent });
    } catch (error) {
        console.error("Error generating problem files route handler:", error);
        // Send back the error structure that the fallback returns for consistency
        res.status(500).json({ 
            pythonCode: `# Error: Failed to generate problem\n\nprint("Internal server error during problem generation.")\n`, 
            readmeContent: `# Error Generating Problem\n\nAn internal server error occurred while trying to generate the debugging problem.\n\nPlease check the server logs for more details.`
        });
    }
  });
  // --- End Modified Route ---

  const httpServer = createServer(app);

  return httpServer;
}
