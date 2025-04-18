import { FC, useRef, useEffect, useState } from 'react';
import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore';
import { FileNode } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { setupAICompletions } from '@/lib/aiService';
import AIActionsMenu from '@/components/AIActionsMenu';
import { Split, MoreVertical, BotIcon, Grid, Layers } from 'lucide-react';

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
      
      // Set editor theme with cyberpunk style
      monaco.editor.defineTheme('cyberpunk-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '4C4C6D', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'FF1493' }, // Neon pink
          { token: 'string', foreground: '00FF7F' },  // Neon green
          { token: 'number', foreground: '00FFFF' },  // Neon cyan
          { token: 'function', foreground: '1E90FF' }, // Neon blue
          { token: 'type', foreground: 'BD00FF' },    // Neon purple
          { token: 'operator', foreground: 'FF1493' },
          { token: 'delimiter', foreground: '888888' },
          { token: 'variable', foreground: 'DCDCAA' },
          { token: 'regexp', foreground: 'FF0000' }
        ],
        colors: {
          'editor.background': '#0A0A14',
          'editor.foreground': '#EEEEFF',
          'editorCursor.foreground': '#FF1493',
          'editor.lineHighlightBackground': '#101026',
          'editor.lineHighlightBorder': '#FF149322',
          'editorLineNumber.foreground': '#444466',
          'editorLineNumber.activeForeground': '#FF1493',
          'editor.selectionBackground': '#FF149322',
          'editor.findMatchBackground': '#00FF7F44',
          'editor.findMatchHighlightBackground': '#00FFFF22',
          'editorSuggestWidget.background': '#0A0A14',
          'editorSuggestWidget.border': '#FF149366',
          'editorSuggestWidget.foreground': '#EEEEFF',
          'editorSuggestWidget.selectedBackground': '#FF149322',
          'editorSuggestWidget.highlightForeground': '#FF1493',
          'editorBracketMatch.background': '#00FFFF22',
          'editorBracketMatch.border': '#00FFFF66'
        }
      });
      
      monaco.editor.setTheme('cyberpunk-dark');
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
    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number }}) => {
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

  // Add glitch effect for a dystopian feel
  const [isGlitching, setIsGlitching] = useState<boolean>(false);
  
  useEffect(() => {
    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.05) { // 5% chance of glitching
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 300);
      }
    }, 3000);
    
    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {/* Background grid for cyberpunk effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0" 
        style={{
          backgroundImage: `linear-gradient(rgba(75, 75, 100, 0.3) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(75, 75, 100, 0.3) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}>
      </div>
      
      {/* Glitch effect overlay */}
      {isGlitching && (
        <div className="absolute inset-0 bg-primary/5 z-10 pointer-events-none">
          <div className="absolute top-0 left-0 h-[1px] w-full bg-primary/30 animate-[scan_1s_linear_infinite]"></div>
        </div>
      )}
      
      {/* Editor actions */}
      <div className="p-3 absolute right-2 top-2 z-20 flex gap-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-primary/10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSplitEditor} 
          title="Split Editor"
          className="h-7 w-7 rounded-sm hover:bg-primary/10 group"
        >
          <Split className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          title="Toggle Grid"
          className="h-7 w-7 rounded-sm hover:bg-primary/10 group"
        >
          <Grid className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          title="More Actions"
          className="h-7 w-7 rounded-sm hover:bg-primary/10 group"
        >
          <MoreVertical className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
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
      
      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={file.language || "javascript"}
          value={file.content || "// Loading file content..."}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { 
              enabled: true,
              maxColumn: 60,
              renderCharacters: false,
              scale: 1
            },
            scrollBeyondLastLine: false,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace",
            fontSize: 13,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            cursorBlinking: 'phase',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            glyphMargin: true,
            folding: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            }
          }}
        />
      </div>
      
      {/* AI information banner */}
      <div className="absolute bottom-4 right-4 cyberpunk-box px-3 py-1.5 text-xs font-mono z-10 flex items-center space-x-2">
        <BotIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
        <span className="text-primary neon-text tracking-wide">CTRL+I</span>
        <span className="text-muted-foreground">| ACTIVATE AI</span>
      </div>
    </div>
  );
};

export default MonacoEditor;
