import { FC, useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { Button } from '@/components/ui/button';
import 'xterm/css/xterm.css';

interface TerminalPanelProps {
  onClose: () => void;
}

const TerminalPanel: FC<TerminalPanelProps> = ({ onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef(new FitAddon());
  const [commandInput, setCommandInput] = useState('');
  const { activeFile } = useFileSystemStore();

  // Initialize terminal
  useEffect(() => {
    if (terminalRef.current && !terminalInstance.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: '"Consolas", Monaco, monospace',
        fontSize: 12,
        rendererType: 'canvas',
        convertEol: true,
        theme: {
          background: '#1E1E1E',
          foreground: '#CCCCCC',
          cursor: 'white',
          selection: 'rgba(255, 255, 255, 0.3)',
          black: '#000000',
          red: '#f44747',
          green: '#4EC9B0',
          yellow: '#CE9178',
          blue: '#0078D4',
          magenta: '#C586C0',
          cyan: '#009AC5',
          white: '#CCCCCC',
          brightBlack: '#666666',
          brightRed: '#F55757',
          brightGreen: '#5EE9C0',
          brightYellow: '#DEA188',
          brightBlue: '#0088E4',
          brightMagenta: '#D596D0',
          brightCyan: '#00BAD5',
          brightWhite: '#FFFFFF'
        }
      });
      
      term.loadAddon(fitAddon.current);
      term.open(terminalRef.current);
      fitAddon.current.fit();
      
      // Welcome message
      term.writeln('\x1b[1;34mAI-Powered Code Editor Terminal\x1b[0m');
      term.writeln('Type \x1b[1;33mhelp\x1b[0m for available commands.');
      term.write('\r\n$ ');
      
      // Handle terminal input
      term.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
        
        if (domEvent.key === 'Enter') {
          executeCommand(term, commandInput);
          setCommandInput('');
        } else if (domEvent.key === 'Backspace') {
          if (commandInput.length > 0) {
            term.write('\b \b');
            setCommandInput(prev => prev.slice(0, -1));
          }
        } else if (printable) {
          term.write(key);
          setCommandInput(prev => prev + key);
        }
      });
      
      // Store terminal instance
      terminalInstance.current = term;
      
      // Handle resize
      const handleResize = () => {
        fitAddon.current.fit();
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }
  }, []);

  // Execute terminal commands
  const executeCommand = (term: Terminal, command: string) => {
    term.writeln('');
    
    switch (command.trim()) {
      case 'help':
        term.writeln('\x1b[1;33mAvailable commands:\x1b[0m');
        term.writeln('  help         - Show this help');
        term.writeln('  clear        - Clear the terminal');
        term.writeln('  ls           - List files');
        term.writeln('  cat [file]   - Display file content');
        term.writeln('  pwd          - Show current directory');
        term.writeln('  echo [text]  - Print text');
        break;
        
      case 'clear':
        term.clear();
        break;
        
      case 'ls':
        term.writeln('\x1b[1;34msrc/\x1b[0m');
        term.writeln('\x1b[1;34mnode_modules/\x1b[0m');
        term.writeln('package.json');
        term.writeln('README.md');
        break;
        
      case 'pwd':
        term.writeln('/project');
        break;
        
      default:
        if (command.startsWith('echo ')) {
          term.writeln(command.substring(5));
        } else if (command.startsWith('cat ')) {
          const fileName = command.substring(4).trim();
          term.writeln(`\x1b[1;31mError: File "${fileName}" not found\x1b[0m`);
        } else if (command.trim() !== '') {
          term.writeln(`\x1b[1;31mCommand not found: ${command}\x1b[0m`);
        }
        break;
    }
    
    term.write('\r\n$ ');
  };

  const minimizeTerminal = () => {
    // Implement minimize functionality
    console.log('Minimize terminal');
  };

  const addNewTerminal = () => {
    // Implement new terminal creation
    console.log('Add new terminal');
  };

  return (
    <>
      <div className="h-9 flex items-center px-3 justify-between bg-sidebar">
        <div className="flex items-center">
          <span className="text-sm font-medium">Terminal</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2" 
            onClick={addNewTerminal}
          >
            <span className="material-icons text-sm">add</span>
          </Button>
        </div>
        <div className="flex">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={minimizeTerminal}
          >
            <span className="material-icons text-sm">keyboard_arrow_up</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
          >
            <span className="material-icons text-sm">close</span>
          </Button>
        </div>
      </div>
      
      {/* Terminal content */}
      <div 
        ref={terminalRef} 
        className="flex-1 font-mono text-xs"
      />
    </>
  );
};

export default TerminalPanel;
