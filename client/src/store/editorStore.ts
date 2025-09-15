import { create } from 'zustand';
import * as monaco from 'monaco-editor'; // Import monaco types

// Define IRange and IStandaloneCodeEditor types locally or ensure they are globally available if needed
type IRange = monaco.IRange;
type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;

interface EditorState {
  isCommandPaletteOpen: boolean;
  editorPosition: { lineNumber: number; column: number };
  editorTheme: string;
  editors: { [fileId: string]: IStandaloneCodeEditor }; // Store editor instances
  
  toggleCommandPalette: () => void;
  setEditorPosition: (position: { lineNumber: number; column: number }) => void;
  setEditorTheme: (theme: string) => void;
  registerEditor: (fileId: string, editor: IStandaloneCodeEditor) => void; // Action to register editor
  unregisterEditor: (fileId: string) => void; // Action to unregister editor
  applySnippetEdit: (fileId: string, range: IRange, newText: string) => void; // Action to apply edit
}

export const useEditorStore = create<EditorState>((set, get) => ({
  isCommandPaletteOpen: false,
  editorPosition: { lineNumber: 1, column: 1 },
  editorTheme: 'vs-dark', // Default theme
  editors: {}, // Initial empty map for editors
  
  toggleCommandPalette: () => 
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  
  setEditorPosition: (position) => 
    set({ editorPosition: position }),
  
  setEditorTheme: (theme) => {
    set({ editorTheme: theme });
    // Optionally apply theme to all registered editors
    Object.values(get().editors).forEach(editor => monaco.editor.setTheme(theme));
  },

  registerEditor: (fileId, editor) => {
    // Validate parameters
    if (!fileId || typeof fileId !== 'string') {
      console.error(`Invalid fileId provided to registerEditor: ${fileId}`);
      return;
    }
    
    if (!editor) {
      console.error(`Invalid editor instance provided to registerEditor for file ID: ${fileId}`);
      return;
    }
    
    console.log(`Registering editor for file ID: ${fileId}`);
    set((state) => {
      // Check if we already have this editor registered
      const existingEditor = state.editors[fileId];
      if (existingEditor === editor) {
        console.log(`Editor for file ID ${fileId} is already registered and identical - skipping`);
        return state; // Return unchanged state
      }
      
      const newEditors = { ...state.editors, [fileId]: editor };
      // Log the state *after* this update is calculated
      console.log(`State after registration attempt for ${fileId}:`, Object.keys(newEditors));
      return { editors: newEditors };
    });
  },

  unregisterEditor: (fileId) => {
    console.log(`Unregistering editor for file ID: ${fileId}`);
    set((state) => {
      const newEditors = { ...state.editors };
      delete newEditors[fileId];
      return { editors: newEditors };
    });
  },
  
  applySnippetEdit: (fileId, range, newText) => {
    const editorsMap = get().editors;
    // Log the keys currently present in the editors map
    console.log(`Attempting applySnippetEdit for file ID: ${fileId}. Registered editor IDs:`, Object.keys(editorsMap));
    
    const editor = editorsMap[fileId]; // Use the map fetched above
    if (editor) {
      console.log(`Applying snippet edit for file ID: ${fileId}`, range, newText);
      try {
        // editor.getModel()?.pushEditOperations([], [{ range: range, text: newText }], () => null);
        // Use executeEdits for better undo/redo integration
        editor.executeEdits('ai-snippet-fix', [
          {
            range: range,
            text: newText,
            forceMoveMarkers: true // Attempt to move cursor/markers appropriately
          }
        ]);
        console.log("Snippet edit applied successfully.");
      } catch (error) {
        console.error(`Error applying snippet edit for file ID ${fileId}:`, error);
        // Optionally throw the error or handle it (e.g., show a notification)
        throw new Error(`Failed to apply edit: ${error}`);
      }
    } else {
      console.error(`Cannot apply snippet edit: Editor instance for file ID ${fileId} not found.`);
      
      // Add retry mechanism - try again after a short delay to allow for editor registration
      const maxRetries = 3;
      const retryInterval = 500; // ms
      
      let retryCount = 0;
      const retryEdit = () => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying snippet edit for file ID ${fileId} (attempt ${retryCount}/${maxRetries})...`);
          
          setTimeout(() => {
            const updatedEditorsMap = get().editors;
            const editorOnRetry = updatedEditorsMap[fileId];
            
            if (editorOnRetry) {
              console.log(`Editor found on retry ${retryCount}, applying edit...`);
              try {
                editorOnRetry.executeEdits('ai-snippet-fix', [
                  {
                    range: range,
                    text: newText,
                    forceMoveMarkers: true
                  }
                ]);
                console.log("Snippet edit applied successfully on retry.");
              } catch (retryError) {
                console.error(`Error applying snippet edit on retry for file ID ${fileId}:`, retryError);
                if (retryCount < maxRetries) {
                  retryEdit(); // Try again
                } else {
                  throw new Error(`Failed to apply edit after ${maxRetries} retries: ${retryError}`);
                }
              }
            } else if (retryCount < maxRetries) {
              retryEdit(); // Try again if editor still not found
            } else {
              throw new Error(`Editor instance for file ${fileId} not found after ${maxRetries} retries.`);
            }
          }, retryInterval);
        } else {
          throw new Error(`Editor instance for file ${fileId} not found after ${maxRetries} retries.`);
        }
      };
      
      // Start retry process
      retryEdit();
    }
  }
}));
