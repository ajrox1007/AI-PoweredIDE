import { create } from 'zustand';
import { ChatMessage, ModifyCodeIntent } from '@shared/schema';
import { 
  getCodeCompletion, 
  sendChatQuery, 
  generateTestsForCode,
  explainSelectedCode,
  findBugsInCode,
  modifyCodeWithAI,
  fixCodeSnippetWithAI,
  type CodeModificationEvent
} from '@/lib/aiService';
import { useFileSystemStore } from './fileSystemStore'; // Corrected import path
import { type IRange } from 'monaco-editor'; // Import Monaco range type
import { diffLines, type Change } from 'diff'; // Import diffLines and Change type
import { useEditorStore } from './editorStore'; // Import editor store to access editor actions

// Keep track of the current SSE connection closer
let currentSseCloser: (() => void) | null = null;

// Function to ensure the AI Panel stays visible
const ensureAIPanelVisible = () => {
  // Use custom event to trigger the panel to be shown
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai:ensure-panel-visible'));
    console.log('Dispatched event to ensure AI panel visibility');
  }
};

interface AiState {
  chatMessages: ChatMessage[];
  isLoading: boolean;
  aiStatus: string;
  currentModificationChunks: string[]; // To accumulate chunks for preview
  selectedCodeForChat: string | null;
  selectedCodeRangeForChat: IRange | null; // NEW: Store the range of selected code
  isWaitingForFixInstructions: boolean; // New flag
  
  // AI Actions
  fetchCompletion: (code: string, position: any) => Promise<string[]>;
  sendChatMessage: (message: string, fileId?: string) => Promise<void>;
  applyCodeModification: (prompt: string, fileId: string) => Promise<void>;
  fixCodeSelection: (fileId: string, selection: IRange, selectedCode: string) => Promise<void>;
  generateTests: () => Promise<void>;
  explainCode: () => Promise<void>;
  findBugs: () => Promise<void>;
  setSelectedCodeForChat: (code: string | null, range: IRange | null) => void; // MODIFIED: Accept range
  submitFixRequest: (instructions: string) => Promise<void>; // MODIFIED: Logic inside will change

  // Helper to cancel ongoing AI modification
  cancelCurrentModification: () => void;
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
  currentModificationChunks: [],
  selectedCodeForChat: null, // Initial value
  selectedCodeRangeForChat: null, // NEW: Initial value
  isWaitingForFixInstructions: false, // Initial value
  
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
    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    // Add user message and set loading state
    set(state => ({ 
      chatMessages: [...state.chatMessages, userMessage],
      isLoading: true,
      aiStatus: 'Thinking...'
    }));

    try {
      // Get AI response (could be string or ModifyCodeIntent)
      const response = await sendChatQuery(message, get().chatMessages, fileId);

      // --- Handle Response --- 
      if (typeof response === 'object' && response.intent === 'modify_code') {
        // Intent detected: Trigger modification, DON'T add intent object to chat
        set({ isLoading: false, aiStatus: 'Ready' }); // Stop thinking state for chat
        if (fileId) {
          get().applyCodeModification(response.prompt, fileId); // This action will add its own outcome message
        } else {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: 'Please open a file first before asking me to modify code.',
            timestamp: Date.now()
          };
          // Add error message if no file is active
          set(state => ({ chatMessages: [...state.chatMessages, errorMessage], isLoading: false, aiStatus: 'Error' }));
        }
      } else if (typeof response === 'string') {
        // Normal string response: Add it to chat
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
      } else {
         // Unexpected response format
         throw new Error('Received unexpected response format from AI chat');
      }
      // --- End Handle Response ---

    } catch (error) {
      console.error('Error processing chat message or intent:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      // Add error message to chat
      set(state => ({ 
        chatMessages: [...state.chatMessages, errorMessage],
        isLoading: false,
        aiStatus: 'Error'
      }));
    }
  },
  
  applyCodeModification: async (prompt, fileId) => {
    get().cancelCurrentModification(); 

    const fileSystemStore = useFileSystemStore.getState();
    const file = fileSystemStore.files.find((f: any) => f.id === fileId);

    if (!file || file.type !== 'file') {
      const errorMessage: ChatMessage = { role: 'assistant', content: 'Could not find the specified file to modify.', timestamp: Date.now() };
      set(state => ({ chatMessages: [...state.chatMessages, errorMessage], isLoading: false, aiStatus: 'Error' }));
      return;
    }

    const originalCode = file.content || '';
    const language = file.language;
    let accumulatedContent = '';

    set({ isLoading: true, aiStatus: 'Initiating modification...', currentModificationChunks: [] });

    // Ensure the AI panel is visible
    ensureAIPanelVisible();

    const callbacks = {
      onData: (event: CodeModificationEvent) => {
        set({ aiStatus: event.message || get().aiStatus });

        switch (event.type) {
          case 'status':
            // Optionally add status messages to chat?
            // set(state => ({ chatMessages: [...state.chatMessages, { role: 'system', content: event.message, timestamp: Date.now() }] }));
            break;
          case 'chunk':
            if (event.content) {
              accumulatedContent += event.content;
              set({ aiStatus: 'Receiving changes...' });
            }
            break;
          case 'complete':
            if (event.status === 'success' && event.finalCode) {
              fileSystemStore.updateFileContent(fileId, event.finalCode);
              
              // Calculate the diff
              const changes: Change[] = diffLines(originalCode, event.finalCode); 
              
              // Create success message WITH the diff
              const successMsg: ChatMessage = { 
                role: 'assistant', 
                content: 'Code modification applied successfully.', 
                timestamp: Date.now(),
                diff: changes // Attach the diff result
              };
              set(state => ({ chatMessages: [...state.chatMessages, successMsg], isLoading: false, aiStatus: 'Ready', currentModificationChunks: [] }));
              
              // Ensure AI panel is visible after successful modification
              ensureAIPanelVisible();
            } else {
              const noChangeMsg: ChatMessage = { role: 'assistant', content: event.message || 'No changes were necessary based on the request.', timestamp: Date.now() };
              set(state => ({ chatMessages: [...state.chatMessages, noChangeMsg], isLoading: false, aiStatus: 'Ready', currentModificationChunks: [] }));
            }
            currentSseCloser = null;
            break;
          case 'error':
            const errorMsg: ChatMessage = { role: 'assistant', content: `Error during modification: ${event.message || 'Unknown error'}`, timestamp: Date.now() };
            set(state => ({ chatMessages: [...state.chatMessages, errorMsg], isLoading: false, aiStatus: 'Error', currentModificationChunks: [] }));
            currentSseCloser = null;
            break;
        }
      },
      onError: (error: Error) => {
        console.error('SSE Error Callback:', error);
        const errorMsg: ChatMessage = { role: 'assistant', content: `Connection error during modification: ${error.message}`, timestamp: Date.now() };
        set(state => ({ chatMessages: [...state.chatMessages, errorMsg], isLoading: false, aiStatus: 'Error', currentModificationChunks: [] }));
        currentSseCloser = null;
      },
      onClose: () => {
        console.log('SSE Closed Callback');
        // Ensure loading state is off if closed prematurely or normally without reaching 'complete'/ 'error' event
        if (get().isLoading) {
          set({ isLoading: false, aiStatus: 'Ready' }); 
        }
        currentSseCloser = null;
      }
    };

    try {
        currentSseCloser = modifyCodeWithAI(prompt, originalCode, language, callbacks);
    } catch (error) {
        // Catch synchronous errors from service function itself (unlikely)
        console.error('Error calling modifyCodeWithAI:', error);
        const errorMsg: ChatMessage = { role: 'assistant', content: `Failed to start modification process: ${error instanceof Error ? error.message : 'Unknown error'}`, timestamp: Date.now() };
        set(state => ({ chatMessages: [...state.chatMessages, errorMsg], isLoading: false, aiStatus: 'Error', currentModificationChunks: [] }));
        currentSseCloser = null;
    }
  },
  
  fixCodeSelection: async (fileId, selection, selectedCode) => {
    // This action might become less relevant or repurposed
    // For now, let's keep its original intention but note the new flow
    console.warn('Direct fixCodeSelection called. Consider using the chat flow.');
    const tempPrompt = `Fix the following code snippet (lines ${selection.startLineNumber}-${selection.endLineNumber}):\\n\\n${selectedCode}\\n\\nConsider the surrounding code context.`;
    get().applyCodeModification(tempPrompt, fileId); // Trigger the streaming modification
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
  },

  cancelCurrentModification: () => {
    if (currentSseCloser) {
      console.log("Cancelling current AI modification stream.");
      currentSseCloser();
      currentSseCloser = null;
      set({ isLoading: false, aiStatus: 'Modification cancelled', currentModificationChunks: [] });
      // Optionally add a cancellation message to chat
      set(state => ({ chatMessages: [...state.chatMessages, { role: 'system', content: 'Code modification cancelled by user.', timestamp: Date.now() }] }));
    }
  },

  // --- New Actions ---
  setSelectedCodeForChat: (code, range) => { // MODIFIED: Accept range
    if (code && code.trim().length > 0 && range) { // MODIFIED: Check for range too
      set({ 
        selectedCodeForChat: code, 
        selectedCodeRangeForChat: range, // NEW: Store range
        isWaitingForFixInstructions: true, 
        // Optionally add a system message to the chat?
        // chatMessages: [...get().chatMessages, { role: 'system', content: `Selected code ready. Please provide instructions for fixing it.`, timestamp: Date.now() }]\n      });
      });
      console.log("Selected code set for chat:", code, "Range:", range);
    } else {
      // Clear if code is null or empty or range is missing
      set({ 
        selectedCodeForChat: null, 
        selectedCodeRangeForChat: null, // NEW: Clear range
        isWaitingForFixInstructions: false 
      });
      console.log("Selection cleared or empty/range missing, resetting chat fix state.");
    }
  },

  submitFixRequest: async (instructions) => {
    const { selectedCodeForChat, selectedCodeRangeForChat } = get(); 
    const fileSystemStore = useFileSystemStore.getState();
    const editorStore = useEditorStore.getState(); 
    const activeFileId = fileSystemStore.activeFileId;
    const activeFile = fileSystemStore.activeFile;

    // Ensure the AI panel remains visible
    ensureAIPanelVisible();

    // --- Validation Checks (as before) ---
    if (!selectedCodeForChat || !selectedCodeRangeForChat || !activeFileId || !activeFile) {
        // Error handling as before...
        console.error("Missing data for submitFixRequest");
        set(state => ({ 
            chatMessages: [...state.chatMessages, { role: 'assistant', content: 'Error: Missing data for snippet fix.', timestamp: Date.now() }],
            isLoading: false, 
            aiStatus: 'Error', 
            isWaitingForFixInstructions: false,
            selectedCodeForChat: null,
            selectedCodeRangeForChat: null
        }));
        return;
    }
    
    // --- Add User Message & Set Loading State (as before) ---
    const userMessage: ChatMessage = {
      role: 'user',
      content: `Fix Request (Snippet):\n\`\`\`${activeFile.language || ''}\n${selectedCodeForChat}\n\`\`\`\nInstructions: ${instructions}`,
      timestamp: Date.now()
    };
    set(state => ({ 
      chatMessages: [...state.chatMessages, userMessage],
      isLoading: true, 
      aiStatus: 'Requesting snippet fix...', 
      isWaitingForFixInstructions: false, 
    }));

    // --- Prepare Prompt for Backend ---
    // This prompt is sent *to* the backend's fixSnippet function
    const snippetFixPrompt = `Given the following code snippet (originally selected from lines ${selectedCodeRangeForChat.startLineNumber} to ${selectedCodeRangeForChat.endLineNumber} in a ${activeFile.language || 'unknown'}-language file):
\`\`\`${activeFile.language || ''}\n${selectedCodeForChat}\n\`\`\`
Apply these instructions:
${instructions}

Return ONLY the modified code snippet.`;

    // --- Call Backend & Apply Edit --- 
    try {
      set({ aiStatus: 'AI is fixing snippet...' });
      
      // Call the NEW backend service function
      const modifiedSnippet = await fixCodeSnippetWithAI(snippetFixPrompt, selectedCodeForChat, activeFile.language);

      // Check if the service returned an error message string
      if (modifiedSnippet.startsWith('Error:')) {
        throw new Error(modifiedSnippet); // Throw error to be caught below
      }

      // Apply the successful edit using the editor store
      editorStore.applySnippetEdit(activeFileId, selectedCodeRangeForChat, modifiedSnippet); 

      // Add success message
      const successMsg: ChatMessage = {
        role: 'assistant',
        content: 'Code snippet modification applied successfully.',
        timestamp: Date.now()
        // Optionally add a diff here if desired, comparing selectedCodeForChat and modifiedSnippet
      };
      set(state => ({ 
        chatMessages: [...state.chatMessages, successMsg], 
        isLoading: false, 
        aiStatus: 'Ready', 
        selectedCodeForChat: null, // Clear selection on success
        selectedCodeRangeForChat: null 
       }));

    } catch (error) {
       // Handle errors from fixCodeSnippetWithAI or applySnippetEdit
       console.error("Error during snippet fix request or application:", error);
       const errorMsg: ChatMessage = {
         role: 'assistant',
         content: `Error applying fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
         timestamp: Date.now()
       };
       set(state => ({ 
         chatMessages: [...state.chatMessages, errorMsg], 
         isLoading: false, 
         aiStatus: 'Error applying fix', 
         // Clear selection even on error to avoid inconsistent state?
         selectedCodeForChat: null, 
         selectedCodeRangeForChat: null 
       }));
    }
  },
  // --- End New Actions ---
}));

// Helper function (if needed elsewhere)
export function getActiveCodeAndFileId() {
    const { activeFileId, files } = useFileSystemStore.getState();
    const activeFile = files.find(f => f.id === activeFileId);
    return { code: activeFile?.content || '', fileId: activeFileId };
}
