# Local Terminal Proxy for CodeCraftEditor

This feature allows you to run terminal commands from the CodeCraftEditor directly on your local machine, providing a real terminal experience directly in the browser.

## How It Works

The Local Terminal Proxy creates a simple bridge between the browser-based terminal in CodeCraftEditor and your local shell environment. This allows you to:

- Execute real shell commands directly from the editor
- Run Python scripts and other code in your actual environment
- Access your local filesystem and tools

## Setup Instructions

### 1. Start the Local Proxy Server

In a separate terminal window, run:

```bash
npm run proxy
```

This will start the proxy server on port 3030. You should see output like:

```
Local proxy server running on port 3030
IMPORTANT: Only requests from localhost are accepted for security reasons
```

### 2. Use the Terminal in CodeCraftEditor

1. Open the terminal panel in the editor
2. The terminal will automatically detect the local proxy and switch to "Local Proxy" mode
3. You can now run commands as if you were in a regular terminal

### Switching Between Modes

- The terminal panel has a "Local" / "WS" button that lets you toggle between:
  - **Local Proxy Mode**: Executes commands on your local machine
  - **WebSocket Mode**: Uses the simulated environment

## Security Considerations

The local proxy server:

- Only accepts connections from localhost
- Rejects potentially dangerous commands (like `rm -rf /` or commands with `sudo`)
- Runs on your local machine only - nothing is sent to any external servers

## Troubleshooting

If you encounter issues:

1. Make sure the proxy server is running (`npm run proxy`)
2. Check that no other service is using port 3030
3. If the terminal doesn't automatically connect to the proxy, click the "Local" button
4. Look for error messages in both the browser console and the terminal running the proxy

## Implementation Details

The local proxy consists of:

1. `server/local-proxy.js`: A simple Express server that executes commands
2. `client/src/lib/localTerminalService.ts`: Client-side service for connecting to the proxy
3. Terminal panel integration in the editor UI 