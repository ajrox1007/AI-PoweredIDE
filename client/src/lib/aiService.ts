import { apiRequest } from './queryClient';
import { ChatMessage } from '@shared/schema';
import debounce from 'lodash/debounce';

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
          items: suggestions.map((text: string) => ({ insertText: text }))
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
    const response = await apiRequest('POST', '/api/ai/complete', {
      code,
      position,
      maxResults: 5,
    });
    
    const data = await response.json();
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
    const response = await apiRequest('POST', '/api/ai/generate-tests', {});
    const data = await response.json();
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
    const response = await apiRequest('POST', '/api/ai/explain-code', {});
    const data = await response.json();
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
    const response = await apiRequest('POST', '/api/ai/refactor-code', {});
    const data = await response.json();
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
    const response = await apiRequest('POST', '/api/ai/find-bugs', {});
    const data = await response.json();
    return data.bugReport;
  } catch (error) {
    console.error('Error finding bugs:', error);
    throw error;
  }
}
