import OpenAI from "openai";
import { ChatMessage } from "@shared/schema";
import type { ChatCompletionMessageParam } from "openai/resources";

// Initialize the OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Get code completions from OpenAI
 */
export async function getCompletions(code: string, position: { lineNumber: number; column: number }): Promise<string[]> {
  try {
    // Get the code up to the cursor position
    const lines = code.split('\n');
    const contextLines = lines.slice(0, position.lineNumber - 1);
    const currentLine = lines[position.lineNumber - 1]?.substring(0, position.column) || '';
    const codeContext = [...contextLines, currentLine].join('\n');
    
    // Get the programming language based on the file
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'py': 'Python',
      'md': 'Markdown'
    };
    
    // Determine language from code context (simple heuristic)
    let fileExtension = 'js';
    if (code.includes('import React') || code.includes('export default function') || code.includes('const [')) {
      fileExtension = code.includes('<') ? 'tsx' : 'ts';
    } else if (code.includes('def ') && code.includes(':')) {
      fileExtension = 'py';
    } else if (code.includes('<html') || code.includes('<!DOCTYPE')) {
      fileExtension = 'html';
    }
    
    const language = languageMap[fileExtension] || 'JavaScript';
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an intelligent code completion assistant for ${language}. 
        Given the context, provide 3-5 likely completions that continue from the cursor position.
        Respond with JSON array of completion strings.`
      },
      {
        role: "user",
        content: `Complete this code:\n\n${codeContext}|`
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    try {
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      const parsed = JSON.parse(content);
      // Handle both ['string1', 'string2'] and {"completions": ['string1', 'string2']} formats
      const completions = Array.isArray(parsed) ? parsed : parsed.completions || [];
      return completions.slice(0, 5);
    } catch (err) {
      console.error('Error parsing OpenAI completions:', err);
      return [];
    }
  } catch (error) {
    console.error('Error getting completions from OpenAI:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Send a chat message to OpenAI and get a response
 */
export async function chatWithAI(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    // Convert the chat history to OpenAI format
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a helpful programming assistant integrated into a code editor. Help the user with coding questions, explain concepts, suggest improvements, and help debug issues. Be concise and helpful. When sharing code, use proper markdown formatting with ```language code blocks."
      },
      ...history.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500
    });
    
    return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error('Error chatting with OpenAI:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to get response from AI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate test cases for code
 */
export async function generateTests(code: string, language: string = 'javascript'): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a testing expert. Generate comprehensive test cases for the following ${language} code. Include unit tests covering normal cases, edge cases, and error handling. Use appropriate testing frameworks (Jest for JavaScript/TypeScript, pytest for Python, etc.).`
      },
      {
        role: "user",
        content: code
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.5
    });
    
    return response.choices[0].message.content || "I couldn't generate tests for this code. Please check the format and try again.";
  } catch (error) {
    console.error('Error generating tests with OpenAI:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to generate tests: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Explain selected code
 */
export async function explainCode(code: string): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are an expert code explainer. Analyze the given code snippet and provide a clear, concise explanation of what it does, how it works, and any important patterns or techniques it uses. Break down complex operations into simple terms."
      },
      {
        role: "user",
        content: `Explain this code:\n\n${code}`
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.3
    });
    
    return response.choices[0].message.content || "I couldn't generate an explanation for this code. Please check the format and try again.";
  } catch (error) {
    console.error('Error explaining code with OpenAI:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to explain code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Refactor the given code
 */
export async function refactorCode(code: string): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a code refactoring expert. Improve the given code by making it more readable, efficient, and maintainable. Apply best practices and modern language features. Explain your changes clearly. Return both the original and refactored code with explanations."
      },
      {
        role: "user",
        content: `Refactor this code to improve it:\n\n${code}`
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.3
    });
    
    return response.choices[0].message.content || "I couldn't refactor this code. Please check the format and try again.";
  } catch (error) {
    console.error('Error refactoring code with OpenAI:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to refactor code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find bugs in the given code
 */
export async function findBugsInCode(code: string): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a code review expert specializing in finding bugs and issues. Analyze the code carefully and identify any bugs, edge cases, potential errors, or improvements. Report findings with line references and suggest fixes."
      },
      {
        role: "user",
        content: `Review this code for bugs and issues:\n\n${code}`
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.3
    });
    
    return response.choices[0].message.content || "I couldn't find any bugs in this code or couldn't process it properly. Please check the format and try again.";
  } catch (error) {
    console.error('Error finding bugs with OpenAI:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to find bugs: ${error instanceof Error ? error.message : String(error)}`);
  }
}
