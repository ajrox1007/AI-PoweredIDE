import { FC, useState, useEffect, useCallback } from 'react';
import MonacoEditor from './MonacoEditor';
import AIChatPanel from './AIChatPanel';
import TerminalPanel from './TerminalPanel';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { X, Code, FileCode, FileJson, FileType, Terminal, Braces, Bot, RefreshCw, Play, PanelLeftClose, PanelRightClose, PanelTopClose } from 'lucide-react';

// Define props interface
interface EditorContainerProps {
  aiPanelVisible: boolean;
  toggleAiPanel: () => void;
}

const EditorContainer: FC<EditorContainerProps> = ({ aiPanelVisible, toggleAiPanel }) => {
  const { activeFile, activeFiles, closeFile, selectFile } = useFileSystemStore();
  const { editorPosition, setEditorPosition } = useEditorStore();
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [terminalSize, setTerminalSize] = useState(25);

  const runCurrentCode = useCallback(() => {
    if (!activeFile) return;
    console.log(`Running code in ${activeFile.name}`);
    if (!terminalVisible) setTerminalVisible(true);
    
    let command = '';
    switch(activeFile.language) {
      case 'javascript':
        command = `node -e "${(activeFile.content || '').replace(/"/g, '\\"')}"`;
        break;
      case 'python':
        const pyContent = activeFile.content || '# No content';
        const escapedContent = pyContent.replace(/`/g, '\`').replace(/"/g, '\"').replace(/\$/g, '\$');
        command = `python3 -c "${escapedContent}"`;
        break;
      default:
        command = `echo "Execution not supported for ${activeFile.language || 'this file type'} yet."`;
    }
    window.dispatchEvent(new CustomEvent('terminal:run-command', { detail: { command } }));
  }, [activeFile, terminalVisible]);

  const toggleTerminal = () => setTerminalVisible(!terminalVisible);

  const getFileIcon = (language?: string) => {
    const iconClass = "h-3.5 w-3.5 mr-1.5 text-muted-foreground";
    switch(language) {
      case 'javascript': return <FileCode className={iconClass} />;
      case 'typescript': return <FileCode className={iconClass} />;
      case 'python': return <FileCode className={iconClass} />;
      case 'html': return <FileCode className={iconClass} />;
      case 'css': return <FileType className={iconClass} />;
      case 'json': return <FileJson className={iconClass} />;
      case 'markdown': return <Braces className={iconClass} />;
      default: return <Braces className={iconClass} />;
    }
  };

  const validActiveFiles = activeFiles.filter(file => file && file.id);

  return (
    <div className="flex-1 flex flex-col relative bg-background">
      <div className="h-10 border-b border-border flex items-center px-1 space-x-1 overflow-x-auto scrollbar-thin">
        {validActiveFiles.map((file) => (
          <Button
            key={file.id}
            variant={activeFile?.id === file.id ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 text-xs font-normal flex items-center gap-1 group flex-shrink-0"
            onClick={() => selectFile(file.id)}
          >
            {getFileIcon(file.language)}
            <span className="truncate max-w-[150px]">{file.name || 'Untitled'}</span>
            <X 
              className="h-3.5 w-3.5 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.id);
              }}
            />
          </Button>
        ))}
        {validActiveFiles.length === 0 && (
          <div className="px-3 text-xs text-muted-foreground italic">
            No files open
          </div>
        )}
        <div className="ml-auto flex items-center pr-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={runCurrentCode} disabled={!activeFile}>
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Run File (Ctrl+Enter)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTerminal}>
                  <PanelTopClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{terminalVisible ? 'Hide' : 'Show'} Terminal</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={100 - (terminalVisible ? terminalSize : 0)}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={100 - (aiPanelVisible ? 25 : 0)} className="min-w-[300px]">
              <div className="h-full w-full">
                {activeFile ? (
                  <MonacoEditor 
                    file={activeFile}
                    position={editorPosition}
                    onPositionChange={setEditorPosition}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Select a file or create a new one.
                  </div>
                )}
              </div>
            </ResizablePanel>
            {aiPanelVisible && (
              <>
                <ResizableHandle 
                   withHandle 
                />
                <ResizablePanel 
                    minSize={15} 
                    maxSize={70}
                    className={cn(
                      "min-w-[250px] bg-card border-l border-border",
                    )}
                  >
                  <AIChatPanel 
                     key={activeFile?.id || 'no-active-file'}
                     onClose={toggleAiPanel} 
                   />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>
        {terminalVisible && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={terminalSize} 
              minSize={10} 
              maxSize={50} 
              onResize={(size) => setTerminalSize(size)}
              className="min-h-[100px] bg-card border-t border-border"
            >
              <TerminalPanel onClose={toggleTerminal} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default EditorContainer;
