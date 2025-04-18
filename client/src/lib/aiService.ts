import { apiRequest } from './queryClient';
import { ChatMessage } from '@shared/schema';
import debounce from 'lodash/debounce';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';

/**
 * Set up AI completions for Monaco Editor
 */
export function setupAICompletions(monaco: any, fetchCompletionFn: any) {
  const debounceTime = 300; // milliseconds
  
  const debouncedFetchCompletion = debounce(async (model, position) => {
    const code = model.getValue();
    const positionObj = {
      lineNumber: position.lineNumber,
      column: position.column
    };
    
    try {
      return await fetchCompletionFn(code, positionObj);
    } catch (error) {
      console.error('Error in debouncedFetchCompletion:', error);
      return [];
    }
  }, debounceTime);
  
  // Register completion provider for common languages
  ['javascript', 'typescript', 'html', 'css', 'json', 'python', 'markdown'].forEach(language => {
    monaco.languages.registerInlineCompletionsProvider(language, {
      provideInlineCompletions: async (model, position) => {
        const suggestions = await debouncedFetchCompletion(model, position);
        return {
          items: suggestions.map((text: string) => ({ 
            insertText: text,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            }
          }))
        };
      }
    });
  });
}

/**
 * Get code completion suggestions from the API
 */
export async function getCodeCompletion(code: string, position: any): Promise<string[]> {
  try {
    // Get the active file information for better context
    const fileSystemStore = useFileSystemStore.getState();
    const activeFile = fileSystemStore.activeFile;
    
    const payload = {
      code,
      position,
      maxResults: 5,
      fileId: activeFile?.id,
      language: activeFile?.language
    };
    
    const response = await apiRequest('POST', '/api/ai/complete', payload);
    
    const data = await response.json();
    
    if (data.error && data.missingKey) {
      console.error('OpenAI API key is missing');
      return ['// OpenAI API key is missing. Please add it to continue.'];
    }
    
    return data.suggestions || [];
  } catch (error) {
    console.error('Error getting code completion:', error);
    return [];
  }
}

/**
 * Send a chat message to the AI and get a response
 */
export async function sendChatQuery(
  message: string,
  history: ChatMessage[],
  fileId?: string
): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/ai/chat', {
      message,
      history: history.slice(-10), // Send only the last 10 messages for context
      fileId
    });
    
    const data = await response.json();
    
    if (data.error && data.missingKey) {
      return "I notice that the OpenAI API key is missing. Please add your OpenAI API key to enable AI-powered features.";
    }
    
    // If we get back updated history, update our history
    if (data.history) {
      // We could update our history here if needed
    }
    
    return data.response;
  } catch (error) {
    console.error('Error sending chat query:', error);
    throw error;
  }
}

/**
 * Generate tests for the current code
 */
export async function generateTestsForCode(): Promise<string> {
  try {
    // Get the active file content
    const fileSystemStore = useFileSystemStore.getState();
    const activeFile = fileSystemStore.activeFile;
    
    if (!activeFile) {
      return "Please open a file to generate tests for.";
    }
    
    const code = activeFile.content || '';
    const language = activeFile.language || 'javascript';
    
    const response = await apiRequest('POST', '/api/ai/generate-tests', {
      code,
      language
    });
    
    const data = await response.json();
    
    if (data.error && data.missingKey) {
      return "I notice that the OpenAI API key is missing. Please add your OpenAI API key to enable AI-powered features.";
    }
    
    return data.tests;
  } catch (error) {
    console.error('Error generating tests:', error);
    throw error;
  }
}

/**
 * Get an explanation for the selected code
 */
export async function explainSelectedCode(): Promise<string> {
  try {
    // Get the active file and selection
    const fileSystemStore = useFileSystemStore.getState();
    const editorStore = useEditorStore.getState();
    const activeFile = fileSystemStore.activeFile;
    
    if (!activeFile) {
      return "Please open a file to explain.";
    }
    
    // For now, we'll use the whole file, but this should be updated to use the selected text
    const code = activeFile.content || '';
    
    const response = await apiRequest('POST', '/api/ai/explain-code', {
      code
    });
    
    const data = await response.json();
    
    if (data.error && data.missingKey) {
      return "I notice that the OpenAI API key is missing. Please add your OpenAI API key to enable AI-powered features.";
    }
    
    return data.explanation;
  } catch (error) {
    console.error('Error explaining code:', error);
    throw error;
  }
}

/**
 * Refactor the selected code
 */
export async function refactorSelectedCode(): Promise<string> {
  try {
    // Get the active file and selection
    const fileSystemStore = useFileSystemStore.getState();
    const editorStore = useEditorStore.getState();
    const activeFile = fileSystemStore.activeFile;
    
    if (!activeFile) {
      return "Please open a file to refactor.";
    }
    
    // For now, we'll use the whole file, but this should be updated to use the selected text
    const code = activeFile.content || '';
    
    const response = await apiRequest('POST', '/api/ai/refactor-code', {
      code
    });
    
    const data = await response.json();
    
    if (data.error && data.missingKey) {
      return "I notice that the OpenAI API key is missing. Please add your OpenAI API key to enable AI-powered features.";
    }
    
    return data.refactored;
  } catch (error) {
    console.error('Error refactoring code:', error);
    throw error;
  }
}

/**
 * Find bugs in the current code
 */
export async function findBugsInCode(): Promise<string> {
  try {
    // Get the active file content
    const fileSystemStore = useFileSystemStore.getState();
    const activeFile = fileSystemStore.activeFile;
    
    if (!activeFile) {
      return "Please open a file to analyze for bugs.";
    }
    
    const code = activeFile.content || '';
    
    const response = await apiRequest('POST', '/api/ai/find-bugs', {
      code
    });
    
    const data = await response.json();
    
    if (data.error && data.missingKey) {
      return "I notice that the OpenAI API key is missing. Please add your OpenAI API key to enable AI-powered features.";
    }
    
    return data.bugReport;
  } catch (error) {
    console.error('Error finding bugs:', error);
    throw error;
  }
}
