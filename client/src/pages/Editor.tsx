import { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import Sidebar from '@/components/Sidebar';
import EditorContainer from '@/components/EditorContainer';
import StatusBar from '@/components/StatusBar';
import CommandPalette from '@/components/CommandPalette';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { FileNode } from '@shared/schema';

export default function Editor() {
  const { isCommandPaletteOpen, toggleCommandPalette } = useEditorStore();
  const { loadSavedFiles } = useFileSystemStore();

  const { files, activeFileId, selectFile } = useFileSystemStore();
  
  useEffect(() => {
    // Load files from IndexedDB when component mounts
    const loadAndSelectDefaultFile = async () => {
      await loadSavedFiles();
      
      // If no file is currently selected but we have files, select the first one
      if (!activeFileId && files.length > 0) {
        // Find and select index.js as the default file
        const indexFile = files.find(file => file.name === 'index.js');
        if (indexFile) {
          selectFile(indexFile.id);
        } else {
          // If index.js doesn't exist, select the first file
          const firstFile = files.find(file => file.type === 'file');
          if (firstFile) {
            selectFile(firstFile.id);
          }
        }
      }
    };
    
    loadAndSelectDefaultFile();
    
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
  }, [isCommandPaletteOpen, toggleCommandPalette, loadSavedFiles, activeFileId, files, selectFile]);

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
