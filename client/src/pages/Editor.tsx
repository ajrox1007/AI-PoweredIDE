import { useEffect, useState, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import Sidebar from '@/components/Sidebar';
import EditorContainer from '@/components/EditorContainer';
import StatusBar from '@/components/StatusBar';
import CommandPalette from '@/components/CommandPalette';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { FileNode } from '@shared/schema';
import WebPreview from '@/components/WebPreview';
import { Button } from '@/components/ui/button';

const PROBLEM_FILENAME = 'problem.py';
const README_FILENAME = 'problem_readme.md';

export default function Editor() {
  const { isCommandPaletteOpen, toggleCommandPalette } = useEditorStore();
  const { loadSavedFiles, files, activeFileId, selectFile, addFileWithContent } = useFileSystemStore();
  
  // Lifted state for AI Panel visibility
  const [aiPanelVisible, setAiPanelVisible] = useState(true); // Default to visible
  const [isPreviewVisible, setIsPreviewVisible] = useState(false); // <-- State for preview visibility

  const toggleAiPanel = useCallback(() => {
      console.log(`Toggling AI Panel. Current visibility: ${aiPanelVisible}`);
      setAiPanelVisible(prev => !prev);
  }, [aiPanelVisible]);

  const togglePreview = useCallback(() => { // <-- Toggle function for preview
    console.log(`Toggling Preview Panel. Current visibility: ${isPreviewVisible}`);
    setIsPreviewVisible(prev => !prev);
  }, [isPreviewVisible]);

  // Add event listener for ensuring AI panel visibility
  useEffect(() => {
    const ensurePanelVisible = () => {
      console.log('AI panel visibility event received');
      setAiPanelVisible(true);
    };

    window.addEventListener('ai:ensure-panel-visible', ensurePanelVisible);
    
    return () => {
      window.removeEventListener('ai:ensure-panel-visible', ensurePanelVisible);
    };
  }, []);

  // Effect 1: Load files on mount
  useEffect(() => {
    console.log("EFFECT 1: Initial load trigger");
    loadSavedFiles();
  }, [loadSavedFiles]); // Depend only on the stable loadSavedFiles function reference

  // Effect 2: Generate initial problem and select default file after files are loaded
  useEffect(() => {
    console.log(`EFFECT 2: Running due to files change (count: ${files.length}) or activeFileId change (${activeFileId})`);
    // Only proceed if files have been loaded
    if (files.length === 0) {
      console.log("EFFECT 2: Files not loaded yet, skipping.");
      return; 
    }

    const problemFileExists = files.some(f => f.name === PROBLEM_FILENAME);
    const readmeFileExists = files.some(f => f.name === README_FILENAME);

    const handleProblemGeneration = async () => {
      if (!problemFileExists || !readmeFileExists) {
        console.log('EFFECT 2: Initial problem files not found, generating...');
        try {
          const response = await fetch('/api/generate-problem', { method: 'POST' });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const { pythonCode, readmeContent } = await response.json();
          
          let newlyAddedProblemId: string | null = null;
          if (!readmeFileExists) await addFileWithContent(README_FILENAME, 'markdown', readmeContent);
          if (!problemFileExists) newlyAddedProblemId = await addFileWithContent(PROBLEM_FILENAME, 'python', pythonCode);
          
          console.log('EFFECT 2: Initial problem files generated and added.');
          // If we just added the problem file, select it immediately
          if (newlyAddedProblemId) {
              console.log('EFFECT 2: Selecting newly added problem file:', newlyAddedProblemId);
              selectFile(newlyAddedProblemId);
          } else if (!activeFileId) {
              // If problem file existed but nothing is active, select it now
              const problemFile = files.find(f => f.name === PROBLEM_FILENAME);
              if (problemFile) {
                  console.log('EFFECT 2: Selecting existing problem file (no active file):', problemFile.id);
                  selectFile(problemFile.id);
              }
          }
        } catch (error) {
          console.error('EFFECT 2: Failed to fetch or add initial problem files:', error);
        }
      } else {
          // Files exist, check if we need to select the default
          if (!activeFileId) {
              const problemFile = files.find(f => f.name === PROBLEM_FILENAME);
              if (problemFile) {
                  console.log('EFFECT 2: Selecting existing problem file (no active file):', problemFile.id);
                  selectFile(problemFile.id);
              } else {
                  // Fallback: select first available file if problem file not found
                  const firstFile = files.find(file => file.type === 'file');
                  if (firstFile) {
                      console.log('EFFECT 2: Selecting first available file (fallback):', firstFile.id);
                      selectFile(firstFile.id);
                  }
              }
          }
      }
    };

    handleProblemGeneration();
    
    // Dependencies: runs when files array changes OR activeFileId changes
    // Also include actions needed within the effect
  }, [files, activeFileId, addFileWithContent, selectFile]);

  // Effect 3: Handle keyboard shortcuts (remains separate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        toggleCommandPalette();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCommandPaletteOpen, toggleCommandPalette]); // Only depends on palette state/toggle

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader title="AI-Powered Code Editor" onTogglePreview={togglePreview} />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
            <EditorContainer 
              aiPanelVisible={aiPanelVisible} 
              toggleAiPanel={toggleAiPanel} 
            />
            {isPreviewVisible && (
              <div className="h-1/2 border-t border-gray-700 overflow-auto">
                  <WebPreview />
              </div>
            )}
        </div>
      </div>
      
      <StatusBar 
        toggleAiPanel={toggleAiPanel} 
        isAiPanelVisible={aiPanelVisible} 
      />
      
      {/* Command palette (Cmd+K) */}
      {isCommandPaletteOpen && <CommandPalette />}
    </div>
  );
}
