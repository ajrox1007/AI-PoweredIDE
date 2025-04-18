/**
 * Execute a command in the terminal
 */
export async function executeCommand(command: string): Promise<string> {
  try {
    const response = await fetch('/api/terminal/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });
    
    const data = await response.json();
    return data.output;
  } catch (error) {
    console.error('Error executing command:', error);
    return `Error: ${error.message}`;
  }
}

/**
 * Get command history
 */
export async function getCommandHistory(): Promise<string[]> {
  try {
    const response = await fetch('/api/terminal/history');
    const data = await response.json();
    return data.history;
  } catch (error) {
    console.error('Error getting command history:', error);
    return [];
  }
}

/**
 * Clear terminal history
 */
export async function clearCommandHistory(): Promise<void> {
  try {
    await fetch('/api/terminal/clear-history', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error clearing command history:', error);
  }
}
