import { FC, useRef, useEffect, useState, useCallback } from 'react';
import Editor, { Monaco, useMonaco, loader } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor'; // Import monaco itself
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore'; // Import AI store
import { useEditorStore } from '@/store/editorStore'; // Import Editor store
import { FileNode } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { setupAICompletions } from '@/lib/aiService';
import AIActionsMenu from '@/components/AIActionsMenu';
import { Split, MoreVertical, BotIcon, Grid, Layers, Sparkles } from 'lucide-react'; // Add Sparkles icon

interface MonacoEditorProps {
  file: FileNode;
  position?: { lineNumber: number; column: number };
  onPositionChange: (position: { lineNumber: number; column: number }) => void;
}

// Define types for Monaco interfaces used
type IStandaloneCodeEditor = monacoEditor.editor.IStandaloneCodeEditor;
type ICodeLensProvider = monacoEditor.languages.CodeLensProvider;
type IRange = monacoEditor.IRange;
type ICodeLensList = monacoEditor.languages.CodeLensList;
type ICodeLens = monacoEditor.languages.CodeLens;
type CancellationToken = monacoEditor.CancellationToken;
type ITextModel = monacoEditor.editor.ITextModel;

const MonacoEditor: FC<MonacoEditorProps> = ({ file, position, onPositionChange }) => {
  const { updateFileContent } = useFileSystemStore();
  // Destructure isLoading and aiStatus from aiStore
  const { fetchCompletion, fixCodeSelection, isLoading, aiStatus, setSelectedCodeForChat } = useAiStore();
  const { registerEditor, unregisterEditor } = useEditorStore(); // Get editor registration actions
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco();
  // const [currentSelection, setCurrentSelection] = useState<IRange | null>(null);
  // const codeLensProviderRef = useRef<monacoEditor.IDisposable | null>(null);
  // State to hold the IDs of current decorations
  const [aiDecorations, setAiDecorations] = useState<string[]>([]);

  // --- AI Actions Menu State (Keep existing or adapt) ---
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
  // --- End AI Actions Menu State ---

  // Define Theme and Setup AI Completions
  useEffect(() => {
    if (monaco) {
      setupAICompletions(monaco, fetchCompletion);
      monaco.editor.defineTheme('modern-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a9955' },
          { token: 'keyword', foreground: 'c586c0' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'operator', foreground: 'd4d4d4' },
          { token: 'identifier', foreground: '9cdcfe' },
          { token: 'type', foreground: '4ec9b0' },
          { token: 'function', foreground: 'dcdcaa' },
          { token: 'delimiter', foreground: 'd4d4d4' },
          { token: 'variable', foreground: '9cdcfe' },
          { token: 'regexp', foreground: 'd16969' },
        ],
        colors: {
          'editor.background': '#111118',
          'editor.foreground': '#E2E8F0',
          'editorCursor.foreground': '#FFFFFF',
          'editor.lineHighlightBackground': '#1E293B40',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#E2E8F0',
          'editor.selectionBackground': '#27354A',
          'editorSuggestWidget.background': '#1E293B',
          'editorSuggestWidget.border': '#334155',
          'editorSuggestWidget.foreground': '#E2E8F0',
          'editorSuggestWidget.selectedBackground': '#3B82F640',
          'editorBracketMatch.background': '#3B82F620',
          'editorBracketMatch.border': '#3B82F660',
          'editorGutter.background': '#111118',
        }
      });
      monaco.editor.setTheme('modern-dark');
    }
  }, [monaco, fetchCompletion]);

  // Keep useEffect primarily for cleanup and handling file changes
  useEffect(() => {
    const currentFileId = file.id;
    // We no longer register here, just define the cleanup

    // Cleanup function: Unregister the editor when the component unmounts
    // or when the file.id changes (triggering the effect to re-run)
    return () => {
      // No need to check editorRef.current here, just use the ID
      // The editorStore's unregister function handles non-existent keys gracefully
      if (currentFileId) {
        unregisterEditor(currentFileId);
        console.log(`Editor unregistered for file: ${currentFileId}`);
      }
    };
  // Depend on file.id to re-run cleanup/setup for the new file
  // Also depend on unregister function identity (though unlikely to change)
  }, [file.id, unregisterEditor]); 

  // Add a separate effect to ensure editor is registered when the ref is available
  useEffect(() => {
    // This ensures the editor is registered after mounting
    if (editorRef.current && file.id) {
      console.log(`Ensuring editor is registered for file: ${file.id}`);
      registerEditor(file.id, editorRef.current);
    }
  }, [editorRef.current, file.id, registerEditor]);

  // Handle editor mount - THIS is where we will now register
  const handleEditorDidMount = (editor: IStandaloneCodeEditor, _monacoInstance: Monaco) => {
    editorRef.current = editor;
    const currentFileId = file.id; // Get current file ID

    // --- REGISTER EDITOR HERE --- 
    if (currentFileId) {
      console.log(`Calling registerEditor from handleEditorDidMount for file: ${currentFileId}`);
      registerEditor(currentFileId, editor);
    } else {
      console.error("Cannot register editor: file ID is undefined or null");
    }
    // --------------------------- 
    
    // Set editor options
    editor.updateOptions({
        fontFamily: "var(--font-mono)", // Use the CSS variable for font
        fontSize: 13, // Example: Set font size
        fontWeight: '600', // Set font weight to semi-bold
        lineHeight: 20, // Example: Set line height
        minimap: { enabled: false }, // Example: Disable minimap
        wordWrap: 'on', // Example: Enable word wrap
        renderLineHighlight: 'gutter', // Example: Highlight active line in gutter
        scrollbar: {
            verticalScrollbarSize: 8, // Example: Adjust scrollbar size
            horizontalScrollbarSize: 8,
        },
        glyphMargin: true, // Ensure glyph margin is enabled for decorations
    });

    if (position) {
      editor.setPosition(position);
      editor.revealPositionInCenter(position);
    }
    if (file && file.content !== undefined) {
      const model = editor.getModel();
      if (model && model.getValue() !== file.content) {
        model.setValue(file.content);
      }
    }
    editor.onDidChangeCursorPosition((e) => {
      onPositionChange({ lineNumber: e.position.lineNumber, column: e.position.column });
    });

    // --- Listen for Selection Changes ---
    editor.onDidChangeCursorSelection(e => {
      const selection = e.selection;
      const model = editor.getModel();
      // Update selection state only if it's not empty
      if (model && !selection.isEmpty()) {
        const selectedText = model.getValueInRange(selection);
        setSelectedCodeForChat(selectedText, selection);
      } else {
        // Clear selection if it becomes empty, passing null for range too
        setSelectedCodeForChat(null, null);
      }
    });
    
    // --- Existing AI menu shortcut (keep or remove as needed) ---
    editor.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyI, () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || '';
        const editorCoords = editor.getScrolledVisiblePosition(selection.getStartPosition());
        const domNode = editor.getDomNode();
        if (domNode && editorCoords) {
          const editorRect = domNode.getBoundingClientRect();
          const x = editorRect.left + editorCoords.left;
          const y = editorRect.top + editorCoords.top;
          showAiActionsMenu(x, y, selectedText);
        }
      } else {
        console.log('Ctrl+I: No text selected for AI Actions menu');
      }
    });
  };

  // Re-setup CodeLens if selection changes (debounced potentially)
  // useEffect(() => {
  //    setupCodeLens();
  //    // Cleanup on unmount or when dependencies change
  //    return () => {
  //      codeLensProviderRef.current?.dispose();
  //    };
  // }, [setupCodeLens]); // Re-run when setupCodeLens function identity changes

  // Show/Hide AI Actions Menu (existing functions)
  const showAiActionsMenu = (x: number, y: number, selectedText: string) => { setAiMenuConfig({ visible: true, x, y, selectedText }); };
  const hideAiActionsMenu = () => { setAiMenuConfig({ ...aiMenuConfig, visible: false }); };

  // Handle content changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && editorRef.current) {
      // Check if the change is different from the current file content
      // Prevents loop caused by file update triggering editor change
      const currentContent = useFileSystemStore.getState().files.find(f => f.id === file.id)?.content;
      if (value !== currentContent) {
         updateFileContent(file.id, value);
      }
    }
  };

  // Split editor vertically
  const handleSplitEditor = () => { console.log("Split editor clicked"); /* Implementation needed */ };

  // Track file content updates (ensure model exists)
  useEffect(() => {
    if (editorRef.current && file.content !== undefined) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== file.content) {
        // Check cursor position before setting value to avoid losing it
        const currentPosition = editorRef.current.getPosition();
        model.setValue(file.content);
        if (currentPosition) {
            editorRef.current.setPosition(currentPosition);
        }
      }
    }
  }, [file.content, file.id]); // Added file.id dependency

  // --- Effect for AI Activity Decorations ---
  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Determine if AI is actively modifying this specific file
    const isAiModifying = isLoading && aiStatus.toLowerCase().includes('modification') || aiStatus.toLowerCase().includes('receiving') || aiStatus.toLowerCase().includes('fixing');

    let newDecorationIds: string[] = [];
    if (isAiModifying) {
      const fullRange = model.getFullModelRange();
      const newDecorations = [
        {
          range: fullRange,
          options: {
            isWholeLine: true,
            className: 'ai-modifying-line', // Background pulse/highlight
            glyphMarginClassName: 'ai-modifying-glyph', // Glyph margin indicator
          }
        }
      ];
      // Replace previous decorations from this effect instance with the new ones
      newDecorationIds = editor.deltaDecorations([], newDecorations);
    } else {
      // If AI is not modifying, ensure any decorations from previous runs are cleared
      newDecorationIds = editor.deltaDecorations(aiDecorations, []); 
    }
    
    // Update the state with the latest IDs (needed for cleanup)
    setAiDecorations(newDecorationIds); 

    // Cleanup function to remove decorations when component unmounts or dependencies change
    // It uses the 'aiDecorations' value captured when this effect instance ran.
    return () => {
      if (editorRef.current && aiDecorations.length > 0) {
         try {
             // Use the captured aiDecorations IDs from the effect's closure
             editorRef.current.deltaDecorations(aiDecorations, []);
         } catch (e) {
             console.warn("Error clearing decorations on cleanup:", e);
         }
      }
    };
  // Depend only on AI status and editor readiness, NOT on aiDecorations itself
  }, [isLoading, aiStatus, editorRef, monaco]); // Removed aiDecorations dependency

  // Glitch Effect (existing)
  const [isGlitching, setIsGlitching] = useState<boolean>(false);
  useEffect(() => { /* ... existing glitch effect ... */ }, []);

  return (
    <div className="h-full w-full relative">
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
      
      {/* Monaco Editor Wrapper */}
      <div className="h-full relative">
        <Editor
          height="100%"
          language={file.language || 'plaintext'}
          value={file.content || ''} 
          theme="modern-dark" // Consider updating this if global theme changed significantly
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            selectOnLineNumbers: true,
            automaticLayout: true,
            // Keeping previous options, ensure glyphMargin is true for decoration
            glyphMargin: true,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: '600',
            lineHeight: 20,
            minimap: { enabled: false },
            wordWrap: 'on',
            renderLineHighlight: 'gutter',
            scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
            },
            lightbulb: {
               enabled: monacoEditor.editor.ShowLightbulbIconMode.On
            },
            codeLens: true, 
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

