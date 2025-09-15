/**
 * Service for executing terminal commands via the local proxy server
 */

// Configuration for the proxy server
const PROXY_CONFIG = {
  url: 'http://localhost:3030',
  enabled: true // Set to false to fall back to simulated mode
};

/**
 * Execute a command through the local proxy server
 */
export async function executeLocalCommand(command: string): Promise<{ output: string; error: string | null }> {
  try {
    // Skip if proxy is disabled
    if (!PROXY_CONFIG.enabled) {
      return { 
        output: `[Simulated] ${command}`, 
        error: 'Local proxy is disabled. Enable it in localTerminalService.ts'
      };
    }

    // Check if proxy is available
    let proxyAvailable = false;
    try {
      const statusResponse = await fetch(`${PROXY_CONFIG.url}/status`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout to quickly detect if proxy is not running
        signal: AbortSignal.timeout(1000)
      });
      proxyAvailable = statusResponse.ok;
    } catch (e) {
      console.warn('Local proxy server not available:', e);
      proxyAvailable = false;
    }

    if (!proxyAvailable) {
      return { 
        output: '', 
        error: 'Local proxy server not running. Start it with "npm run proxy" in a terminal.'
      };
    }

    // Execute command through proxy
    const response = await fetch(`${PROXY_CONFIG.url}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error executing local command:', error);
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error executing command'
    };
  }
}

/**
 * Check if the local proxy server is available
 */
export async function isLocalProxyAvailable(): Promise<boolean> {
  if (!PROXY_CONFIG.enabled) {
    return false;
  }
  
  try {
    const response = await fetch(`${PROXY_CONFIG.url}/status`, { 
      signal: AbortSignal.timeout(1000)
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Toggle the local proxy server usage
 */
export function toggleLocalProxy(enabled: boolean): void {
  PROXY_CONFIG.enabled = enabled;
} 