import { FC, useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { executeLocalCommand, isLocalProxyAvailable } from '@/lib/localTerminalService';
import 'xterm/css/xterm.css';
import { Plus, Trash2, ChevronUp, X, Wifi, WifiOff, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalPanelProps {
  onClose: () => void;
}

type ConnectionStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Error' | 'LocalProxy';

// Define a darker theme for xterm that matches the new UI
const darkXtermTheme = {
  background: '#111118', // Match editor background
  foreground: '#E2E8F0', // Match editor foreground
  cursor: '#FFFFFF',
  selectionBackground: '#27354A80', // Semi-transparent selection
  black: '#6272a4', // Example colors (adjust as needed)
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#6272a4',
  magenta: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  brightBlack: '#95A5A6',
  brightRed: '#FF6E67',
  brightGreen: '#5AF78E',
  brightYellow: '#F4F99D',
  brightBlue: '#7190FE',
  brightMagenta: '#FF92D0',
  brightCyan: '#9AEDFE',
  brightWhite: '#FFFFFF'
};

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

const TerminalPanel: FC<TerminalPanelProps> = ({ onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef(new FitAddon());
  const webSocket = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('Connecting');
  const [useLocalProxy, setUseLocalProxy] = useState<boolean>(false);
  const commandHistory = useRef<string[]>([]); // Store command history
  const historyIndex = useRef<number>(-1); // Index for navigating history

  // Function to write status messages to the terminal
  const writeStatus = useCallback((message: string) => {
    if (terminalInstance.current) {
      terminalInstance.current.writeln(`\r\n\x1b[1;33m[System] ${message}\x1b[0m`);
      terminalInstance.current.write('$ '); // Add prompt back
    }
  }, []);

  // Execute command logic (minor changes for prompt handling)
  const executeCommand = useCallback(async (command: string) => {
    if (!terminalInstance.current) return;
    terminalInstance.current.writeln(''); // New line before output
    if (command.trim()) { // Store non-empty commands
        commandHistory.current.push(command);
        historyIndex.current = commandHistory.current.length; // Reset index
    }
    
    if (useLocalProxy) {
      try {
        const result = await executeLocalCommand(command);
        if (result.error) terminalInstance.current.writeln(`\x1b[31m${result.error}\x1b[0m`);
        if (result.output) terminalInstance.current.writeln(result.output.replace(/\n/g, '\r\n')); // Ensure newlines are handled
        terminalInstance.current.write('\r\n$ '); // New prompt
      } catch (error) {
        terminalInstance.current.writeln(`\r\n\x1b[31mProxy Error: ${error}\x1b[0m`);
        terminalInstance.current.write('\r\n$ ');
      }
    } else if (webSocket.current?.readyState === WebSocket.OPEN) {
      webSocket.current.send(command + '\n'); // Send command to WS
    } else {
      writeStatus('Error: No connection available');
    }
  }, [useLocalProxy, writeStatus]); // Add writeStatus dependency

  // Check if local proxy is available on mount
  useEffect(() => {
    const checkLocalProxy = async () => {
      if (await isLocalProxyAvailable()) {
        setUseLocalProxy(true);
        setStatus('LocalProxy');
      }
    };
    checkLocalProxy();
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (terminalRef.current && !terminalInstance.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 600, // Set font weight to semi-bold
        theme: darkXtermTheme, // Apply the new dark theme
        convertEol: true,
        rows: 10 // Default rows, FitAddon will adjust
      });
      
      term.loadAddon(fitAddon.current);
      term.open(terminalRef.current);
      try {
           fitAddon.current.fit();
      } catch (e) {
          console.warn("Initial terminal fit error:", e);
      }
      terminalInstance.current = term;

      term.writeln('\x1b[1;34mCodeCraftEditor Terminal\x1b[0m');
      term.write('$ ');
      term.focus();

      let currentCommand = '';
      term.onData((data) => {
        const code = data.charCodeAt(0);
        if (code === 13) { // Enter
          executeCommand(currentCommand);
          currentCommand = '';
        } else if (code === 127) { // Backspace
          if (currentCommand.length > 0) {
            term.write('\b \b');
            currentCommand = currentCommand.slice(0, -1);
          }
        } else if (code === 27 && data.length > 1) { // Arrow keys (and potentially others)
            if (data === '\x1b[A') { // Up arrow
                if (historyIndex.current > 0) {
                    historyIndex.current--;
                    term.write('\x1b[2K\r$ '); // Clear line and move cursor
                    currentCommand = commandHistory.current[historyIndex.current];
                    term.write(currentCommand);
                }
            } else if (data === '\x1b[B') { // Down arrow
                 if (historyIndex.current < commandHistory.current.length - 1) {
                    historyIndex.current++;
                    term.write('\x1b[2K\r$ ');
                    currentCommand = commandHistory.current[historyIndex.current];
                    term.write(currentCommand);
                 } else if (historyIndex.current === commandHistory.current.length -1) {
                     historyIndex.current++;
                     term.write('\x1b[2K\r$ '); // Clear line if at end of history
                     currentCommand = '';
                 }
            }
            // Ignore other escape sequences for now
        } else if (code >= 32) { // Printable characters
          currentCommand += data;
          term.write(data);
        }
      });

      // Listener for external commands (like from run button)
      const handleRunCommand = (e: CustomEvent) => {
        const { command } = e.detail;
        if (terminalInstance.current) {
           terminalInstance.current.write(command + '\r\n'); // Write command visually
           executeCommand(command); // Execute it
        }
      };
      window.addEventListener('terminal:run-command', handleRunCommand as EventListener);

      // Resize observer for the terminal container
      const debouncedFit = debounce(() => {
          try {
            fitAddon.current.fit();
          } catch(e) {
              console.warn("Terminal fit error on resize:", e);
          }
      }, 150); // Debounce fit calls by 150ms
      
      const resizeObserver = new ResizeObserver(debouncedFit);
      if (terminalRef.current) {
          resizeObserver.observe(terminalRef.current);
      }
      
      // Initial fit after a short delay to ensure layout is stable
      setTimeout(() => debouncedFit(), 50);

      // Cleanup
      return () => {
        resizeObserver.disconnect(); // Disconnect the observer
        window.removeEventListener('terminal:run-command', handleRunCommand as EventListener);
        term.dispose();
        terminalInstance.current = null;
      };
    }
  }, [executeCommand]); // Re-run if executeCommand changes (due to useLocalProxy)

  // Effect to connect WebSocket if not using local proxy
  useEffect(() => {
    if (!useLocalProxy && terminalInstance.current) {
       setStatus('Connecting');
       writeStatus('Attempting to connect to backend WebSocket...');
       const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
       const wsUrl = `${wsProtocol}//${window.location.host}/terminal`; 
       webSocket.current = new WebSocket(wsUrl);

       webSocket.current.onopen = () => {
          setStatus('Connected');
          writeStatus('WebSocket Connected.');
       };
       webSocket.current.onclose = () => {
           setStatus('Disconnected');
           if (!useLocalProxy) { // Only show error if we expected WS connection
                writeStatus('WebSocket Disconnected. Switched to Local Proxy if available, or commands may fail.');
                // Optionally try switching to local proxy if available
                isLocalProxyAvailable().then(avail => { if (avail) setUseLocalProxy(true); setStatus('LocalProxy'); });
           }
       };
       webSocket.current.onerror = () => {
            setStatus('Error');
            writeStatus('WebSocket Connection Error.');
       };
       webSocket.current.onmessage = (event) => {
          terminalInstance.current?.write(event.data);
       };
       
       return () => { webSocket.current?.close(); };
    } else if (useLocalProxy && webSocket.current) {
       webSocket.current.close();
       webSocket.current = null;
    }
  }, [useLocalProxy, writeStatus]); // Depend on useLocalProxy and writeStatus
  
  // Toggle mode function
  const toggleProxyMode = async () => {
     if (!useLocalProxy) {
       if (await isLocalProxyAvailable()) {
         setUseLocalProxy(true);
         setStatus('LocalProxy');
         writeStatus('Switched to Local Proxy mode.');
       } else {
         writeStatus('Local proxy server not available. Run "npm run proxy".');
       }
     } else {
       setUseLocalProxy(false);
       setStatus('Disconnected'); // Will trigger WS connection attempt
       writeStatus('Switched to WebSocket mode.');
     }
  };

  const clearTerminal = () => terminalInstance.current?.clear();

  return (
    <div className="h-full flex flex-col bg-card text-sm">
      {/* Terminal Header */}
      <div className="h-8 flex items-center px-2 justify-between border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            TERMINAL
          </span>
           <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-sm ${status === 'LocalProxy' ? 'bg-cyan-800 text-cyan-100' : status === 'Connected' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100' }`}>
                {status}
           </span>
        </div>
        <div className="flex items-center gap-1">
           <TooltipProvider delayDuration={300}>
              <Tooltip>
                 <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        onClick={toggleProxyMode}
                        title={useLocalProxy ? "Switch to WebSocket" : "Switch to Local Proxy (if available)"}
                    >
                       {useLocalProxy ? <WifiOff size={14} /> : <Wifi size={14} />}
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" className="text-xs">
                     {useLocalProxy ? "Switch to WebSocket mode" : "Switch to Local Proxy mode"}
                 </TooltipContent>
              </Tooltip>
           </TooltipProvider>

           <TooltipProvider delayDuration={300}>
              <Tooltip>
                 <TooltipTrigger asChild>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={clearTerminal}
                        className="h-6 w-6 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    >
                        <Trash2 size={14} />
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" className="text-xs">
                     Clear Terminal
                 </TooltipContent>
              </Tooltip>
           </TooltipProvider>

           <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted/50 hover:text-foreground" onClick={onClose}>
             <X size={16} />
           </Button>
        </div>
      </div>
      
      {/* Terminal Instance Container */}
      <div ref={terminalRef} className="w-full flex-grow overflow-hidden"></div>
    </div>
  );
};

export default TerminalPanel;
