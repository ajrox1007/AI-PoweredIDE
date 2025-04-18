import { FC, useRef, useEffect, useState } from 'react';
import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore';
import { FileNode } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { setupAICompletions } from '@/lib/aiService';
import AIActionsMenu from '@/components/AIActionsMenu';

interface MonacoEditorProps {
  file: FileNode;
  position?: { lineNumber: number; column: number };
  onPositionChange: (position: { lineNumber: number; column: number }) => void;
}

const MonacoEditor: FC<MonacoEditorProps> = ({ file, position, onPositionChange }) => {
  const { updateFileContent } = useFileSystemStore();
  const { fetchCompletion } = useAiStore();
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const [aiMenuConfig, setAiMenuConfig] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
  });

  useEffect(() => {
    if (monaco) {
      // Setup Monaco with AI completions
      setupAICompletions(monaco, fetchCompletion);
      
      // Set editor theme
      monaco.editor.defineTheme('aicode-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955' },
          { token: 'keyword', foreground: '569CD6' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'function', foreground: 'DCDCAA' },
          { token: 'type', foreground: '4EC9B0' }
        ],
        colors: {
          'editor.background': '#1E1E1E',
          'editor.foreground': '#CCCCCC',
          'editorCursor.foreground': '#FFFFFF',
          'editor.lineHighlightBackground': '#2A2D2E',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#CCCCCC'
        }
      });
      
      monaco.editor.setTheme('aicode-dark');
    }
  }, [monaco, fetchCompletion]);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    
    // Set cursor position if specified
    if (position) {
      editor.setPosition(position);
      editor.revealPositionInCenter(position);
    }
    
    // Track cursor position changes
    editor.onDidChangeCursorPosition(e => {
      onPositionChange({ lineNumber: e.position.lineNumber, column: e.position.column });
    });
    
    // Add keyboard shortcut for AI-assisted operations
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      // Get the current selection
      const selection = editor.getSelection();
      const selectedText = editor.getModel().getValueInRange(selection);
      
      if (selectedText.trim().length > 0) {
        // Show context menu with AI options
        const editorCoords = editor.getScrolledVisiblePosition(selection.getStartPosition());
        const domNode = editor.getDomNode();
        if (domNode) {
          const editorRect = domNode.getBoundingClientRect();
          const x = editorRect.left + editorCoords.left;
          const y = editorRect.top + editorCoords.top;
          
          // Show AI actions menu (this would be implemented separately)
          showAiActionsMenu(x, y, selectedText);
        }
      } else {
        // Trigger AI completion manually
        console.log('Manually triggering AI completion');
        // This would connect to your AI system to get completions
      }
    });
  };
  
  // Show the AI actions menu
  const showAiActionsMenu = (x: number, y: number, selectedText: string) => {
    setAiMenuConfig({
      visible: true,
      x,
      y,
      selectedText
    });
  };
  
  // Hide the AI actions menu
  const hideAiActionsMenu = () => {
    setAiMenuConfig(prev => ({
      ...prev,
      visible: false
    }));
  };

  // Handle content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      updateFileContent(file.id, value);
    }
  };

  // Split editor vertically
  const handleSplitEditor = () => {
    // Implementation would create a split view
    console.log('Split editor requested');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      <div className="p-4 absolute right-0 top-0 z-10 text-muted-foreground flex gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSplitEditor} 
          title="Split Editor"
        >
          <span className="material-icons text-sm">vertical_split</span>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          title="More Actions"
        >
          <span className="material-icons text-sm">more_vert</span>
        </Button>
      </div>
      
      {/* AI Actions Menu */}
      {aiMenuConfig.visible && (
        <AIActionsMenu
          x={aiMenuConfig.x}
          y={aiMenuConfig.y}
          selectedText={aiMenuConfig.selectedText}
          onClose={hideAiActionsMenu}
        />
      )}
      
      <Editor
        height="100%"
        language={file.language}
        value={file.content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontFamily: "'Consolas', Monaco, monospace",
          fontSize: 13,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          automaticLayout: true,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          glyphMargin: true,
          folding: true
        }}
      />
      
      {/* AI information */}
      <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg text-xs px-2 py-1 shadow-md text-muted-foreground flex items-center">
        <span className="material-icons text-primary mr-1 text-sm">smart_toy</span>
        Press Ctrl+I to use AI features
      </div>
    </div>
  );
};

export default MonacoEditor;
