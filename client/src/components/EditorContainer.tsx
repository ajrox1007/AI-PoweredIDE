import { FC, useState } from 'react';
import MonacoEditor from './MonacoEditor';
import AIChatPanel from './AIChatPanel';
import TerminalPanel from './TerminalPanel';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';

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

  // Get file icon for tabs
  const getFileIcon = (language?: string) => {
    switch(language) {
      case 'javascript':
        return 'javascript';
      case 'typescript':
        return 'code';
      case 'jsx':
      case 'tsx':
        return 'code';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'data_object';
      case 'markdown':
        return 'description';
      default:
        return 'description';
    }
  };

  const getFileIconColor = (language?: string) => {
    switch(language) {
      case 'javascript':
        return 'text-primary';
      case 'typescript':
        return 'text-primary';
      case 'jsx':
      case 'tsx':
        return 'text-accent-green';
      case 'css':
        return 'text-accent-purple';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Tabs */}
      <div className="h-9 bg-background border-b border-border flex items-center px-2 text-sm">
        {activeFiles.map(file => (
          <div 
            key={file.id} 
            className={`${activeFile?.id === file.id ? 'bg-accent/20 text-foreground' : 'text-muted-foreground'} py-1 px-3 rounded-t flex items-center`}
            onClick={() => selectFile(file.id)}
          >
            <span className={`material-icons ${getFileIconColor(file.language)} mr-1 text-sm`}>
              {getFileIcon(file.language)}
            </span>
            <span>{file.name}</span>
            <button 
              className="ml-2 p-1 hover:bg-border rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.id);
              }}
            >
              <span className="material-icons text-xs">close</span>
            </button>
          </div>
        ))}
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
