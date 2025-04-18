import { useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import Sidebar from '@/components/Sidebar';
import EditorContainer from '@/components/EditorContainer';
import StatusBar from '@/components/StatusBar';
import CommandPalette from '@/components/CommandPalette';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';

export default function Editor() {
  const { isCommandPaletteOpen, toggleCommandPalette } = useEditorStore();
  const { loadSavedFiles } = useFileSystemStore();

  useEffect(() => {
    // Load files from IndexedDB when component mounts
    loadSavedFiles();

    // Setup keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl+K to toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }

      // Escape key to close modals
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCommandPaletteOpen, toggleCommandPalette, loadSavedFiles]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader title="AI-Powered Code Editor" />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <EditorContainer />
      </div>
      
      <StatusBar />
      
      {/* Command palette (Cmd+K) */}
      {isCommandPaletteOpen && <CommandPalette />}
    </div>
  );
}
