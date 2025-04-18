import { FC, useRef, useEffect } from 'react';
import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore';
import { FileNode } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { setupAICompletions } from '@/lib/aiService';

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
    </div>
  );
};

export default MonacoEditor;
