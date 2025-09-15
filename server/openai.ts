import OpenAI from "openai";
import { ChatMessage } from "@shared/schema";
import type { ChatCompletionMessageParam } from "openai/resources";
import type { Response } from "express"; // Import Express Response type

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
 * Send a chat message to OpenAI and get a response.
 * Can detect intent to modify code and return structured data.
 */
export async function chatWithAI(message: string, history: ChatMessage[] = []): Promise<string | { intent: string; prompt: string }> {
  try {
    // System prompt instructing the AI on intent detection and response format
    const systemPrompt = `You are a helpful programming assistant in a code editor.
Analyze the user's message. 
If the user is asking a question, explaining something, or having a general conversation, respond naturally.
If the user's message is clearly a request to modify the code in the current editor file (e.g., 'fix this function', 'add comments here', 'refactor this code', 'change variable x to y', 'implement the following logic: ...'), then respond ONLY with a JSON object with the following structure: 
{\"intent\": \"modify_code\", \"prompt\": \"<The user's core instruction for modification>\"}
Do NOT add any explanation or surrounding text when responding with the JSON object.
For all other messages, just provide a helpful textual response.`;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      },
      // Include previous history for context, ensuring content is string
      ...history
        .filter(msg => typeof msg.content === 'string') // Filter out non-string content
        .map(msg => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content as string // Assert content is string here
      })),
      {
        role: "user",
        content: message
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: messages,
      temperature: 0.5, // Balanced temperature
      max_tokens: 1500
    });
    
    const aiResponseContent = response.choices[0].message.content || "";

    // Try to parse the response as JSON for intent detection
    try {
      const parsedJson = JSON.parse(aiResponseContent);
      // Check if it matches our expected structure for modification intent
      if (parsedJson && parsedJson.intent === 'modify_code' && typeof parsedJson.prompt === 'string') {
        console.log('AI detected modify_code intent:', parsedJson.prompt);
        return parsedJson; // Return the structured object
      }
    } catch (e) {
      // Not JSON or doesn't match structure, treat as a normal chat response
      console.log('AI response is standard chat.');
    }
    
    // If it wasn't parsed as a valid modification intent, return the raw string response
    return aiResponseContent || "I couldn't generate a response. Please try again.";

  } catch (error) {
    console.error('Error chatting with OpenAI:', error instanceof Error ? error.message : String(error));
    // Return a standard error string, not the structured object
    return `Error communicating with AI: ${error instanceof Error ? error.message : String(error)}`; 
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
 * Generate a complex Python debugging problem for AI/ML engineers.
 */
export async function generateDebuggingProblem(userPrompt: string): Promise<{ pythonCode: string, readmeContent: string }> {
  console.log("Generating debugging problem with prompt...");
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are tasked with creating advanced Python debugging problems focused on AI/ML for experienced engineers. 
        Follow the user's detailed instructions regarding scenario, buggy code, expected behavior, complexity, and bug types. 
        Structure your response ONLY as a JSON object with two keys: "pythonCode" and "readmeContent".
        Do NOT include any other text, explanations, or markdown formatting outside the JSON structure.
        The pythonCode should be a string containing the buggy Python code (50-100 lines).
        The readmeContent should be a string containing the markdown-formatted scenario, expected behavior, and task description.`
      },
      {
        role: "user",
        content: userPrompt // The detailed prompt provided by the user
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "o4-mini-2025-04-16",
      messages: messages,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty content for debugging problem.');
    }

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed.pythonCode === 'string' && typeof parsed.readmeContent === 'string') {
        console.log("Successfully generated and parsed debugging problem.");
        return { 
          pythonCode: parsed.pythonCode, 
          readmeContent: parsed.readmeContent 
        };
      } else {
        throw new Error('Generated JSON does not contain valid pythonCode and readmeContent strings.');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response for debugging problem:', parseError);
      console.error('Raw OpenAI response:', content);
      throw new Error(`Failed to parse generated problem JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

  } catch (error) {
    console.error('Error generating debugging problem with OpenAI:', error instanceof Error ? error.message : String(error));
    // Fallback to a simple placeholder if generation fails
    console.warn('Falling back to placeholder problem due to OpenAI error.');
    return {
        pythonCode: `# Placeholder Problem: Error during generation\n\ndef placeholder_function():\n  # TODO: Implement actual problem generation\n  print("Error: Could not generate problem from AI.")\n\nplaceholder_function()\n`,
        readmeContent: `# Error Generating Problem\n\nThere was an error communicating with the AI to generate a debugging problem. \n\nPlease check the backend logs and ensure the OpenAI API key is configured correctly.\n\nThis is a placeholder file.`
    };
  }
}

/**
 * Refactor the given code based on a prompt, streaming the response.
 */
export async function refactorCode(code: string, prompt: string, res: Response, language?: string): Promise<void> {
  // Set SSE headers (Moved from routes.ts for encapsulation)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers immediately

  // Helper to write SSE formatted data
  const sendSseData = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a code refactoring and fixing expert for ${language || 'various languages'}. 
        The user will provide code (potentially a fragment or the whole file) and a specific request (e.g., fix bugs, refactor for clarity, add comments, optimize).
        Analyze the request and the code. If the user provides a fragment, consider its context within a larger file.
        Return ONLY the complete, modified code for the entire file, ensuring the fix/refactoring is correctly integrated.
        Do NOT include explanations, markdown formatting, or anything other than the final, complete code block.`
      },
      {
        role: "user",
        content: `${prompt}\n\nCode:\n\`\`\`${language || ''}\n${code}\n\`\`\``
      }
    ];
    
    // Enable streaming
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.2,
      stream: true, // <-- Enable streaming
    });
    
    let combinedContent = "";
    sendSseData({ type: 'status', message: 'Receiving response...' });

    // Iterate over the stream chunks
    for await (const chunk of stream) {
      const contentChunk = chunk.choices[0]?.delta?.content || "";
      if (contentChunk) {
        combinedContent += contentChunk;
        // Send each chunk as an SSE event
        sendSseData({ type: 'chunk', content: contentChunk });
      }
      
      // Check for finish reason (optional, useful for final processing)
      if (chunk.choices[0]?.finish_reason) {
        console.log("Stream finished with reason:", chunk.choices[0].finish_reason);
      }
    }
    
    // Attempt to extract final code from markdown block after streaming completes
    let finalCode = combinedContent;
    const codeBlockMatch = finalCode.match(/```(?:\w*\n)?([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      finalCode = codeBlockMatch[1].trim();
    }

    // Send a final event with the processed code (or original if unchanged/failed)
    if (!finalCode || finalCode.trim() === code.trim()) {
       sendSseData({ type: 'complete', status: 'no_change', message: 'No changes were necessary.' });
    } else {
       sendSseData({ type: 'complete', status: 'success', finalCode: finalCode });
    }

  } catch (error) {
    console.error('Error refactoring code stream with OpenAI:', error instanceof Error ? error.message : String(error));
    // Send an error event over SSE
    sendSseData({ type: 'error', message: `Failed to refactor code: ${error instanceof Error ? error.message : String(error)}` });
  } finally {
    // End the SSE stream
    res.end(); 
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
    
    const content = response.choices[0].message.content;
    // Check for missing API key or abnormal finish reason
    const finishReason = response.choices[0].finish_reason;
    if (!content && finishReason !== 'stop') {
        console.error(`OpenAI finish reason was not 'stop': ${finishReason} during findBugsInCode.`);
        // Return an error message indicating the abnormal finish
        return `Error: AI failed to generate bug report (${finishReason}). Check API key and input.`;
    }
    // Handle potential API key error message in the content itself
    if (content && content.toLowerCase().includes('api key')) {
        console.error("OpenAI API key seems missing or invalid based on content during findBugsInCode.");
        return "Error: OpenAI API key missing or invalid.";
    }
    // Return content or a default message if content is null/empty but finish_reason was 'stop'
    return content || "I couldn't find any bugs in this code or couldn't process it properly. Please check the format and try again.";
  } catch (error) {
    console.error('Error finding bugs with OpenAI:', error instanceof Error ? error.message : String(error));
    // Check if the error message indicates an API key issue
    if (error instanceof Error && (error.message.toLowerCase().includes('api key') || error.message.includes('401'))) {
      return "Error: OpenAI API key missing or invalid.";
    }
    // Use a generic error string for other errors
    return `Error finding bugs: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Fix a specific code snippet based on a prompt.
 * Returns only the modified snippet text.
 */
export async function fixSnippet(prompt: string, snippet: string, language?: string): Promise<string> {
  // Ensure API key exists before making a call
  if (!process.env.OPENAI_API_KEY) {
    console.error('Fix snippet called without OPENAI_API_KEY set.');
    return "Error: OpenAI API key is not configured on the server.";
  }

  try {
    console.log(`Fixing snippet for language: ${language || 'unknown'}`);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        // Instruct the AI to ONLY return the modified snippet
        content: `You are an expert code assistant. The user provides a code snippet and instructions to modify it. 
        Apply the instructions ONLY to the provided snippet.
        Return ONLY the complete, modified code snippet. 
        Do NOT include explanations, markdown formatting (like \`\`\`), or any text other than the final code snippet itself.`
      },
      {
        role: "user",
        // Provide the prompt which contains instructions and original snippet context
        content: prompt 
        // Example prompt structure from frontend was:
        // "Given the following code snippet (originally selected from lines X to Y):\n\`\`\`[lang]\n[snippet]\n\`\`\`\nApply these instructions:\n[instructions]\n\nReturn ONLY the modified code snippet."
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use a capable model
      messages: messages,
      temperature: 0.2, // Lower temperature for more focused code generation
      // max_tokens might be useful if snippets are expected to grow significantly
      // max_tokens: 1024, 
      stream: false // No streaming needed, we want the final snippet
    });
    
    const modifiedSnippet = response.choices[0].message.content;

    if (!modifiedSnippet) {
      // Handle cases where the AI might return empty content or finish due to error
      if (response.choices[0].finish_reason !== 'stop') {
         console.error(`OpenAI finish reason was not 'stop': ${response.choices[0].finish_reason}`);
         return `Error: AI failed to generate fix (${response.choices[0].finish_reason}).`;
      }
      console.warn('OpenAI returned empty content for fixSnippet.');
      // Return original snippet or an empty string if AI provides nothing?
      // Let's return an error for clarity.
      return "Error: AI returned an empty response.";
    }

    // Basic cleanup: Trim whitespace and potentially remove markdown backticks if AI mistakenly adds them
    let finalSnippet = modifiedSnippet.trim();
    const langTag = language || '';
    if (finalSnippet.startsWith(`\`\`\`${langTag}\n`) && finalSnippet.endsWith('\n\`\`\`')) {
      finalSnippet = finalSnippet.substring(3 + langTag.length + 1, finalSnippet.length - 4);
    } else if (finalSnippet.startsWith('```\n') && finalSnippet.endsWith('\n```')) {
      finalSnippet = finalSnippet.substring(4, finalSnippet.length - 4);
    }
    
    console.log("Snippet fix generated successfully.");
    return finalSnippet;

  } catch (error: any) {
    console.error('Error fixing snippet with OpenAI:', error);
    // Check for specific API key errors
    if (error.status === 401 || (error.message && error.message.toLowerCase().includes('api key'))) {
      return "Error: OpenAI API key missing or invalid.";
    }
    // Return a generic error string
    return `Error fixing snippet: ${error.message || String(error)}`; 
  }
}
