import { apiRequest } from './queryClient';
import { ChatMessage, ModifyCodeIntent } from '@shared/schema';
import debounce from 'lodash/debounce';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { fetchEventSource } from '@microsoft/fetch-event-source';

/**
 * Set up AI completions for Monaco Editor
 */
export function setupAICompletions(monaco: any, fetchCompletionFn: any) {
  const debounceTime = 300; // milliseconds
  
  const debouncedFetchCompletion = debounce(async (model: any, position: any) => {
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
      provideInlineCompletions: async (model: any, position: any) => {
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
 * Send a chat message to the AI and get a response.
 * The response might be a string or a ModifyCodeIntent object.
 */
export async function sendChatQuery(
  message: string,
  history: ChatMessage[],
  fileId?: string
): Promise<string | ModifyCodeIntent> {
  try {
    const response = await apiRequest('POST', '/api/ai/chat', {
      message,
      // Filter history to ensure only string content is sent
      history: history.slice(-10).filter(msg => typeof msg.content === 'string'), 
      fileId
    });
    
    // Directly return the JSON data, which contains the 'response' field
    // The backend route now puts either the string or the intent object into data.response
    const data = await response.json(); 
    
    // Handle specific error cases returned in the response field
    if (data.response?.error && data.response?.missingKey) {
      return "Error: OpenAI API key is missing."; 
    }
    if (typeof data.response === 'string' && data.response.startsWith('Error:')) {
      return data.response; // Propagate backend errors
    }
    
    // Return the actual response content (string or ModifyCodeIntent)
    return data.response; 

  } catch (error) {
    console.error('Error sending chat query:', error);
    // Return a simple error string in case of network/request failure
    return `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`; 
  }
}

/**
 * NEW: Type definition for the events streamed from the backend
 */
export interface CodeModificationEvent {
  type: 'status' | 'chunk' | 'complete' | 'error';
  message?: string; // For status/error
  content?: string; // For chunk
  finalCode?: string; // For complete (success)
  status?: string; // For complete (e.g., 'success', 'no_change')
}

/**
 * Function to initiate code modification and handle streamed events via callbacks using fetchEventSource.
 */
export function modifyCodeWithAI(
  prompt: string,
  originalCode: string,
  language: string | undefined,
  callbacks: {
    onData: (event: CodeModificationEvent) => void;
    onError: (error: Error) => void;
    onClose: () => void;
  }
): () => void { // Returns a function to abort the request

  console.log('Initiating fetchEventSource connection for code modification...');
  const ctrl = new AbortController(); // Abort controller to allow cancellation

  fetchEventSource('/api/ai/refactor-code', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ code: originalCode, prompt, language }),
    signal: ctrl.signal, // Pass the abort signal

    onopen: async (response) => {
        if (response.ok && response.headers.get('content-type') === 'text/event-stream') {
            console.log('SSE connection established via fetchEventSource.');
             // callbacks.onData({ type: 'status', message: 'Connection open' });
        } else {
            console.error(`Failed to connect: ${response.status} ${response.statusText}`);
            callbacks.onError(new Error(`Failed to connect: ${response.status} ${response.statusText}`));
             ctrl.abort(); // Abort if connection failed
        }
    },
    onmessage: (event) => {
        try {
            const parsedData: CodeModificationEvent = JSON.parse(event.data);
            console.log('SSE data received:', parsedData);
            callbacks.onData(parsedData); // Pass the parsed event to the store/caller
        } catch (error) {
            console.error('Error parsing SSE data:', error);
            callbacks.onError(new Error('Failed to parse server event.'));
             ctrl.abort(); // Abort on parsing error
        }
    },
    onerror: (err) => {
        console.error('SSE connection error (fetchEventSource):', err);
        callbacks.onError(err instanceof Error ? err : new Error('SSE connection error'));
        // The library automatically stops retrying on fatal errors.
        // Throwing the error here will ensure the promise chain (if any) rejects.
        throw err;
    },
    onclose: () => {
        console.log('SSE connection closed by server (fetchEventSource).');
        callbacks.onClose();
    }
  });

  // Return a function to explicitly abort the connection
  return () => {
    console.log('Manually aborting fetchEventSource connection.');
    ctrl.abort();
  };
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

/**
 * Send a code snippet and instructions to the backend for fixing.
 * Expects only the modified snippet string in return.
 */
export async function fixCodeSnippetWithAI(
  prompt: string, // The prompt containing instructions and context
  snippet: string, // The actual code snippet selected by the user
  language: string | undefined // The language of the code
): Promise<string> { // Returns the modified snippet string
  try {
    console.log("Sending snippet fix request to backend...");
    const payload = {
      prompt, // The detailed prompt constructed in aiStore
      snippet, // Just the selected code
      language 
    };
    
    // Use the existing apiRequest helper
    // TODO: Ensure the backend route '/api/ai/fix-snippet' is created
    const response = await apiRequest('POST', '/api/ai/fix-snippet', payload);
    
    const data = await response.json();
    
    // Handle potential errors returned from the backend API
    if (data.error) {
      console.error('Backend error fixing snippet:', data.error);
      // Check for specific missing key error
      if (data.missingKey) {
          return "Error: OpenAI API key is missing on the server.";
      }
      // Return the generic error message from backend
      return `Error from server: ${data.error}`;
    }
    
    // Assuming the backend returns { modifiedSnippet: "..." } on success
    if (typeof data.modifiedSnippet === 'string') {
      console.log("Received modified snippet from backend.");
      return data.modifiedSnippet;
    } else {
      console.error('Unexpected response format from fix-snippet:', data);
      return "Error: Received unexpected response format from the server.";
    }

  } catch (error) {
    console.error('Error calling fixCodeSnippetWithAI service:', error);
    // Return a user-friendly error message for network or other client-side errors
    return `Error communicating with AI service: ${error instanceof Error ? error.message : 'Unknown error'}`; 
  }
}
