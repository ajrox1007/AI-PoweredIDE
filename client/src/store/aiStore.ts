import { create } from 'zustand';
import { ChatMessage } from '@shared/schema';
import { 
  getCodeCompletion, 
  sendChatQuery, 
  generateTestsForCode,
  explainSelectedCode,
  refactorSelectedCode,
  findBugsInCode
} from '@/lib/aiService';

interface AiState {
  chatMessages: ChatMessage[];
  isLoading: boolean;
  aiStatus: string;
  
  // AI Actions
  fetchCompletion: (code: string, position: any) => Promise<string[]>;
  sendChatMessage: (message: string, fileId?: string) => Promise<void>;
  generateTests: () => Promise<void>;
  explainCode: () => Promise<void>;
  refactorCode: () => Promise<void>;
  findBugs: () => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  chatMessages: [
    {
      role: 'system',
      content: 'Welcome to the AI-Powered Code Editor! I\'m here to help you with coding tasks. Ask me any questions about your code.',
      timestamp: Date.now()
    }
  ],
  isLoading: false,
  aiStatus: 'Ready',
  
  fetchCompletion: async (code, position) => {
    try {
      set({ aiStatus: 'Thinking...' });
      const suggestions = await getCodeCompletion(code, position);
      set({ aiStatus: 'Ready' });
      return suggestions;
    } catch (error) {
      set({ aiStatus: 'Error' });
      console.error('Error fetching completion:', error);
      return [];
    }
  },
  
  sendChatMessage: async (message, fileId) => {
    try {
      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, userMessage],
        isLoading: true,
        aiStatus: 'Thinking...'
      }));
      
      // Get AI response
      const response = await sendChatQuery(message, get().chatMessages, fileId);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
        aiStatus: 'Ready'
      }));
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, errorMessage],
        isLoading: false,
        aiStatus: 'Error'
      }));
    }
  },
  
  generateTests: async () => {
    try {
      set({ aiStatus: 'Generating tests...' });
      
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Generate tests for the current file.',
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, userMessage],
        isLoading: true
      }));
      
      const tests = await generateTestsForCode();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: tests,
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
        aiStatus: 'Ready'
      }));
    } catch (error) {
      console.error('Error generating tests:', error);
      set({ isLoading: false, aiStatus: 'Error' });
    }
  },
  
  explainCode: async () => {
    try {
      set({ aiStatus: 'Analyzing code...' });
      
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Explain the selected code.',
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, userMessage],
        isLoading: true
      }));
      
      const explanation = await explainSelectedCode();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: explanation,
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
        aiStatus: 'Ready'
      }));
    } catch (error) {
      console.error('Error explaining code:', error);
      set({ isLoading: false, aiStatus: 'Error' });
    }
  },
  
  refactorCode: async () => {
    try {
      set({ aiStatus: 'Refactoring code...' });
      
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Refactor the selected code.',
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, userMessage],
        isLoading: true
      }));
      
      const refactored = await refactorSelectedCode();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: refactored,
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
        aiStatus: 'Ready'
      }));
    } catch (error) {
      console.error('Error refactoring code:', error);
      set({ isLoading: false, aiStatus: 'Error' });
    }
  },
  
  findBugs: async () => {
    try {
      set({ aiStatus: 'Analyzing for bugs...' });
      
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Find bugs in the current code.',
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, userMessage],
        isLoading: true
      }));
      
      const bugReport = await findBugsInCode();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: bugReport,
        timestamp: Date.now()
      };
      
      set(state => ({ 
        chatMessages: [...state.chatMessages, assistantMessage],
        isLoading: false,
        aiStatus: 'Ready'
      }));
    } catch (error) {
      console.error('Error finding bugs:', error);
      set({ isLoading: false, aiStatus: 'Error' });
    }
  }
}));
