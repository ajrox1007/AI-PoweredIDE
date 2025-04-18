import { FC, useState, useEffect } from 'react';
import MonacoEditor from './MonacoEditor';
import AIChatPanel from './AIChatPanel';
import TerminalPanel from './TerminalPanel';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { X, Code, FileCode, FileJson, FileType, Terminal, Braces, Bot, RefreshCw } from 'lucide-react';

const EditorContainer: FC = () => {
  const { activeFile, activeFiles, closeFile, selectFile } = useFileSystemStore();
  const { editorPosition, setEditorPosition } = useEditorStore();
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [aiPanelWidth, setAiPanelWidth] = useState(320);

  // Handle resize for AI panel
  const handleAiPanelResize = (e: React.MouseEvent) => {
    const startWidth = aiPanelWidth;
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setAiPanelWidth(Math.max(200, Math.min(600, startWidth - deltaX)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleTerminal = () => {
    setTerminalVisible(!terminalVisible);
  };

  const toggleAiPanel = () => {
    setAiPanelVisible(!aiPanelVisible);
  };

  // Add scan line effect that cycles through tabs
  const [scanTabIndex, setScanTabIndex] = useState<number>(0);
  
  // Filter out any invalid active files
  const validActiveFiles = activeFiles.filter(file => file && file.id);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (validActiveFiles.length > 0) {
        setScanTabIndex(prev => (prev + 1) % validActiveFiles.length);
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, [validActiveFiles.length]);

  // Get file icon for tabs
  const getFileIcon = (language?: string) => {
    const iconProps = { className: "h-4 w-4 mr-1" };
    
    switch(language) {
      case 'javascript':
        return <FileCode {...iconProps} className="h-4 w-4 mr-1 neon-blue" />;
      case 'typescript':
        return <FileCode {...iconProps} className="h-4 w-4 mr-1 neon-pink" />;
      case 'jsx':
      case 'tsx':
        return <Code {...iconProps} className="h-4 w-4 mr-1 neon-cyan" />;
      case 'css':
        return <FileType {...iconProps} className="h-4 w-4 mr-1 neon-green" />;
      case 'html':
        return <Code {...iconProps} className="h-4 w-4 mr-1 neon-green" />;
      case 'json':
        return <FileJson {...iconProps} className="h-4 w-4 mr-1 neon-pink" />;
      case 'markdown':
        return <Braces {...iconProps} className="h-4 w-4 mr-1 text-gray-400" />;
      default:
        return <Braces {...iconProps} className="h-4 w-4 mr-1 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Editor Tabs */}
      <div className="h-10 bg-background border-b border-primary/30 flex items-center px-2 text-xs font-mono relative overflow-hidden">
        {/* Background grid and effects */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{
            backgroundImage: `linear-gradient(rgba(75, 75, 100, 0.3) 1px, transparent 1px)`,
            backgroundSize: '8px 8px'
          }}>
        </div>
        
        <div className="flex items-center z-10 space-x-2 overflow-x-auto scrollbar-thin">
          {validActiveFiles.map((file, index) => (
            <div 
              key={file.id || index} 
              className={`
                relative group py-1 px-3 flex items-center h-8
                border-b-2 transition-all duration-300
                ${activeFile && activeFile.id === file.id 
                  ? 'border-primary text-primary neon-text' 
                  : 'border-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground'}
              `}
              onClick={() => selectFile(file.id)}
            >
              {/* Active file highlight */}
              {activeFile && activeFile.id === file.id && (
                <div className="absolute inset-0 bg-primary/5 -z-10 rounded-sm"></div>
              )}
              
              {/* Scan line effect */}
              {scanTabIndex === index && (
                <div className="absolute h-[1px] w-full top-1/2 left-0 bg-primary/30 z-10"></div>
              )}
              
              {getFileIcon(file.language)}
              
              <span className={`tracking-wide ${activeFile && activeFile.id === file.id ? 'font-medium' : ''}`}>
                {file.name || 'Untitled'}
              </span>
              
              <button 
                className={`ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-primary/20 hover:text-primary`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {/* Empty state */}
          {validActiveFiles.length === 0 && (
            <div className="py-1 px-3 text-muted-foreground">
              No files open
            </div>
          )}
        </div>
        
        {/* Right side actions */}
        <div className="ml-auto flex items-center z-10">
          <button className="p-1 rounded-sm hover:bg-primary/10 group">
            <Terminal
              className="h-4 w-4 group-hover:text-primary transition-colors duration-300"
              onClick={toggleTerminal}
            />
          </button>
          
          <button className="p-1 rounded-sm hover:bg-primary/10 group ml-2">
            <Bot
              className="h-4 w-4 group-hover:text-primary transition-colors duration-300"
              onClick={toggleAiPanel}
            />
          </button>
          
          <button className="p-1 rounded-sm hover:bg-primary/10 group ml-2">
            <RefreshCw className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
          </button>
        </div>
      </div>
      
      {/* Editor content with split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          {activeFile ? (
            <MonacoEditor 
              file={activeFile}
              position={editorPosition}
              onPositionChange={setEditorPosition}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-lg">
              No file open. Select a file from the explorer or create a new one.
            </div>
          )}
        </div>
        
        {/* AI Chat Sidebar */}
        {aiPanelVisible && (
          <div 
            className="bg-sidebar border-l border-border flex flex-col relative"
            style={{ width: `${aiPanelWidth}px` }}
          >
            <AIChatPanel onClose={toggleAiPanel} />
            <div 
              className="resize-handle"
              onMouseDown={handleAiPanelResize}
            />
          </div>
        )}
      </div>
      
      {/* Terminal Panel */}
      {terminalVisible && (
        <div className="h-48 border-t border-border flex flex-col bg-background">
          <TerminalPanel onClose={toggleTerminal} />
        </div>
      )}
    </div>
  );
};

export default EditorContainer;
