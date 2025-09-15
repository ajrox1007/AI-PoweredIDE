import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { FileNode } from '@shared/schema';
import { saveFile, loadFiles, createFile, createFolder, deleteFile, getFile } from '@/lib/fileSystem';
import localforage from 'localforage';

// Initialize a reference to the same store used in fileSystem.ts
const fileStore = localforage.createInstance({
  name: 'aiCodeEditor',
  storeName: 'files'
});

// Define the store state
interface FileSystemState {
  files: FileNode[];
  activeFileId: string | null;
  activeFiles: FileNode[];
  activeFile: FileNode | null;
  
  // Actions
  loadSavedFiles: () => Promise<void>;
  selectFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  createNewFile: () => Promise<string | null>;
  createNewFolder: () => Promise<string | null>;
  deleteFileById: (fileId: string) => Promise<void>;
  updateFileContent: (fileId: string, content: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  clearCache: () => Promise<void>;
  addFileWithContent: (name: string, language: string, content: string) => Promise<string | null>;
}

// Create the store
export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      activeFiles: [],
      activeFile: null,
      
      loadSavedFiles: async () => {
        // Create default files function to avoid repetition
        const createDefaultFiles = async () => {
          console.log('Creating default files');
          const defaultFiles: FileNode[] = [
            {
              id: uuidv4(),
              name: 'index.js',
              path: '/index.js',
              type: 'file',
              language: 'javascript',
              content: '// Welcome to the AI-Powered Code Editor\n\nconsole.log("Hello, World!");\n',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: uuidv4(),
              name: 'README.md',
              path: '/README.md',
              type: 'file',
              language: 'markdown',
              content: '# AI-Powered Code Editor\n\nA modern code editor with AI capabilities.\n',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          // Set files and auto-select first one
          set({ 
            files: defaultFiles,
            activeFileId: defaultFiles[0].id,
            activeFiles: [defaultFiles[0]],
            activeFile: defaultFiles[0]
          });
          
          // Save default files to storage
          for (const file of defaultFiles) {
            await saveFile(file);
          }
        };
        
        try {
          let savedFiles: FileNode[] = [];
          try {
            savedFiles = await loadFiles();
          } catch (loadError) {
            console.error('Failed to load files from storage, creating defaults:', loadError);
            await createDefaultFiles();
            return; // Exit early as we've created default files
          }
          
          if (savedFiles && savedFiles.length > 0) {
            console.log('Loaded saved files:', savedFiles.length);
            set({ files: savedFiles });
            
            // Auto-select first file if none is active
            if (!get().activeFile && savedFiles.length > 0) {
              const firstFile = savedFiles.find(file => file.type === 'file');
              if (firstFile) {
                console.log('Auto-selecting first file:', firstFile.name);
                get().selectFile(firstFile.id);
              }
            }
          } else {
            console.log('No saved files found, creating defaults');
            await createDefaultFiles();
          }
        } catch (error) {
          console.error('Critical error in loadSavedFiles:', error);
          
          // Create a single default file as emergency fallback
          const defaultFile: FileNode = {
            id: uuidv4(),
            name: 'emergency-backup.js',
            path: '/emergency-backup.js',
            type: 'file',
            language: 'javascript',
            content: '// Emergency backup file created due to storage error\n\nconsole.log("Hello, World!");\n',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set({
            files: [defaultFile],
            activeFileId: defaultFile.id,
            activeFiles: [defaultFile],
            activeFile: defaultFile
          });
          
          // Try to save this emergency file
          try {
            await saveFile(defaultFile);
          } catch (saveError) {
            console.error('Failed to save emergency file:', saveError);
          }
        }
      },
      
      selectFile: (fileId: string) => {
        try {
          // Log the action and fileId
          console.log('FileSystemStore: Selecting file with ID:', fileId);
          
          if (!fileId) {
            console.error('FileSystemStore: Invalid file ID (null/undefined)');
            return;
          }
          
          // Ensure fileId is a string
          const fileIdStr = String(fileId);
          
          // Find the file directly in the current state
          const file = findFileById(get().files, fileIdStr);
          
          if (!file) {
            console.error(`FileSystemStore: File not found with ID: ${fileIdStr}`);
            console.log('Available files:', get().files.map(f => ({ id: f.id, name: f.name })));
            return; // Exit early if no file found
          }
          
          console.log('FileSystemStore: Found file:', file.name);

          // Ensure we actually have a valid file object before proceeding
          if (file.type === 'file') {
            // Combine all updates into a single atomic setState call
            // This ensures the UI gets only one update with all changes
            const updatedState: Partial<FileSystemState> = {};
            
            // Clone the file to avoid reference issues
            const finalFile: FileNode = {
              ...file,
              id: file.id,
              name: file.name || 'Untitled', 
              content: file.content || '',
              language: file.language || 'plaintext',
              type: 'file' as const,
              path: file.path || `/${file.name || 'untitled'}`,
              createdAt: file.createdAt || new Date().toISOString(),
              updatedAt: file.updatedAt || new Date().toISOString()
            };
            
            // Update active file ID and active file in state
            updatedState.activeFileId = fileId;
            updatedState.activeFile = finalFile;
            
            // Check if file is already open in tabs
            const isFileActive = get().activeFiles.some(f => f && f.id === fileId);
            
            // If not already open, add to active files
            if (!isFileActive) {
              console.log('FileSystemStore: Adding file to active files:', finalFile.name);
              updatedState.activeFiles = [...get().activeFiles, finalFile];
            }
            
            // Apply all updates in one go
            console.log('FileSystemStore: Updating state with:', 
                        { fileId, fileName: finalFile.name });
            set(updatedState);
            
            // Verify state was updated
            console.log('FileSystemStore: State updated, activeFileId =', get().activeFileId);
            console.log('FileSystemStore: Active file name =', get().activeFile?.name);
          } else {
            console.warn('Attempted to select a folder instead of a file:', fileId);
          }
        } catch (error) {
          console.error('Error selecting file:', error);
        }
      },
      
      closeFile: (fileId: string) => {
        const { activeFiles, activeFileId } = get();
        const updatedActiveFiles = activeFiles.filter(f => f.id !== fileId);
        
        if (updatedActiveFiles.length === 0) {
          set({
            activeFiles: [],
            activeFileId: null,
            activeFile: null
          });
        } else if (activeFileId === fileId) {
          // If we're closing the active file, select the last file in the list
          const newActiveFile = updatedActiveFiles[updatedActiveFiles.length - 1];
          set({
            activeFiles: updatedActiveFiles,
            activeFileId: newActiveFile.id,
            activeFile: newActiveFile
          });
        } else {
          set({
            activeFiles: updatedActiveFiles
          });
        }
      },
      
      createNewFile: async () => {
        const fileName = prompt('Enter file name:', 'new-file.js');
        if (!fileName) return null;
        
        try {
          const fileExtension = fileName.split('.').pop() || 'txt';
          let language = 'plaintext';
          
          // Map common extensions to languages
          switch(fileExtension) {
            case 'js': language = 'javascript'; break;
            case 'ts': language = 'typescript'; break;
            case 'jsx': language = 'jsx'; break;
            case 'tsx': language = 'tsx'; break;
            case 'py': language = 'python'; break;
            case 'html': language = 'html'; break;
            case 'css': language = 'css'; break;
            case 'json': language = 'json'; break;
            case 'md': language = 'markdown'; break;
          }
          
          // Construct the FileNode first
          const newFile: FileNode = {
            id: uuidv4(),
            name: fileName,
            path: `/${fileName}`, // Simple path
            type: 'file',
            language,
            content: '', // Start with empty content
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await createFile(newFile); // Call lib function with the object
          
          set((state) => ({ files: [...state.files, newFile] }));
          get().selectFile(newFile.id); // Select the new file
          return newFile.id; // Return the new file ID

        } catch (error) {
          console.error('Error creating new file:', error);
          return null;
        }
      },
      
      createNewFolder: async () => {
        const folderName = prompt('Enter folder name:', 'new-folder');
        if (!folderName) return null;
        
        try {
          // Construct the FileNode first
           const newFolder: FileNode = {
             id: uuidv4(),
             name: folderName,
             path: `/${folderName}`, // Simple path
             type: 'folder',
             children: [],
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString()
           };
           
           await createFolder(newFolder); // Call lib function with the object

           set((state) => ({ files: [...state.files, newFolder] }));
           return newFolder.id; // Return new folder ID

        } catch (error) {
          console.error('Error creating new folder:', error);
          return null;
        }
      },
      
      deleteFileById: async (fileId: string) => {
        try {
          await deleteFile(fileId);
          set((state) => ({
            files: removeFileFromTree(state.files, fileId),
            activeFiles: state.activeFiles.filter(f => f.id !== fileId),
            activeFileId: state.activeFileId === fileId ? null : state.activeFileId,
            activeFile: state.activeFile?.id === fileId ? null : state.activeFile
          }));
          
          // If we closed the active file, select another one if possible
          if (get().activeFileId === null && get().activeFiles.length > 0) {
            const newActiveFile = get().activeFiles[get().activeFiles.length - 1];
            get().selectFile(newActiveFile.id);
          } else if (get().activeFiles.length === 0 && get().files.length > 0) {
              // If no active files left, but still files exist, select first available file
              const firstFile = get().files.find(f => f.type === 'file');
              if (firstFile) get().selectFile(firstFile.id);
          }
          
        } catch (error) {
          console.error(`Error deleting file ${fileId}:`, error);
        }
      },
      
      updateFileContent: async (fileId: string, content: string) => {
        const file = get().files.find(f => f.id === fileId);
        if (file && file.type === 'file') {
          const updatedFile: FileNode = {
            ...file,
            content,
            updatedAt: new Date().toISOString()
          };
          
          try {
            await saveFile(updatedFile); // Save changes to storage
            set((state) => ({
              files: updateFileInTree(state.files, fileId, updatedFile),
              activeFiles: state.activeFiles.map(f => f.id === fileId ? updatedFile : f),
              activeFile: state.activeFile?.id === fileId ? updatedFile : state.activeFile
            }));
          } catch (error) {
            console.error(`Error updating file ${fileId}:`, error);
          }
        }
      },
      
      refreshFiles: async () => {
        await get().loadSavedFiles();
      },
      
      clearCache: async () => {
        try {
          // Assuming fileStore is defined elsewhere or we use the lib directly?
          // await fileStore.clear(); 
          // Let's clear using iteration if no direct clear available
          const currentFiles = get().files;
          for (const file of currentFiles) {
             await deleteFile(file.id); // Use deleteFile from lib
          }
          set({ files: [], activeFileId: null, activeFiles: [], activeFile: null });
          await get().loadSavedFiles(); // Re-initialize with defaults
          console.log('File cache cleared and defaults reloaded.');
        } catch (error) {
          console.error('Error clearing file cache:', error);
        }
      },

      // Correct implementation for addFileWithContent
      addFileWithContent: async (name, language, content) => {
        try {
            const newFile: FileNode = {
              id: uuidv4(),
              name: name,
              path: `/${name}`,
              type: 'file',
              language: language,
              content: content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            await createFile(newFile); // Call library function
            
            set((state) => ({ files: [...state.files, newFile] })); // Update state
            
            return newFile.id; // Return the ID

        } catch (error) {
            console.error(`Error adding file with content (${name}):`, error);
            return null;
        }
      }
    }),
    // Correct the persist configuration
    {
      name: 'file-system-storage-v4', // Keep a unique name
      // Remove storage adapter if default (localStorage) is okay, 
      // otherwise configure correctly for localforage if needed.
      // storage: createJSONStorage(() => localforage), // Example if using localforage
      
      partialize: (state) => ({ 
        // ONLY persist non-sensitive IDs, not the whole file list
        activeFileId: state.activeFileId,
        // Persist IDs of open tabs/active files
        activeFileIds: state.activeFiles.filter(f => f?.id).map(f => f.id) 
        // DO NOT persist state.files here
      }),
      
      onRehydrateStorage: () => (state, error) => {
         // Logic to run after state is rehydrated from storage
         if (error) {
           console.error("FileSystemStore: Error during rehydration:", error);
           // Potentially clear storage or handle error
         } else {
             console.log('FileSystemStore: Rehydrated state keys:', state ? Object.keys(state) : null);
             // Important: DO NOT assume files are loaded here.
             // The main loading happens in Editor.tsx's useEffect via loadSavedFiles.
             // We might re-select the active file based on rehydrated activeFileId
             // AFTER the main loadSavedFiles completes in Editor.tsx, 
             // perhaps by having loadSavedFiles return the files or using a separate effect.
             
             // Example: If activeFileId was rehydrated, we know which file *should* be active
             // but we wait for loadSavedFiles to actually load it into the main 'files' state.
             if (state?.activeFileId) {
                 console.log('FileSystemStore: Rehydrated activeFileId:', state.activeFileId);
                 // The selection logic in loadSavedFiles or Editor.tsx should handle this.
             }
         }
      }
    }
  )
);

// Helper functions for file tree operations
function findFileById(files: FileNode[], id: string): FileNode | null {
  console.log('findFileById: Looking for file with ID:', id);
  console.log('findFileById: Available files at this level:', files.map(f => ({ id: f.id, name: f.name })));
  
  if (!id) {
    console.error('findFileById: Invalid ID provided (null/undefined)');
    return null;
  }
  
  // Ensure we're comparing strings to strings
  const searchId = String(id);
  
  for (const file of files) {
    // Skip invalid files
    if (!file || !file.id) continue;
    
    // Convert file.id to string to ensure consistent comparison
    if (String(file.id) === searchId) {
      console.log('findFileById: Found matching file:', file.name);
      return file;
    }
    
    if (file.type === 'folder' && file.children && file.children.length > 0) {
      const found = findFileById(file.children, searchId);
      if (found) return found;
    }
  }
  console.log('findFileById: No matching file found for ID:', searchId);
  return null;
}

function updateFileInTree(files: FileNode[], id: string, updates: Partial<FileNode>): FileNode[] {
  return files.map(file => {
    if (file.id === id) {
      return { ...file, ...updates };
    } else if (file.type === 'folder' && file.children) {
      return { ...file, children: updateFileInTree(file.children, id, updates) };
    }
    return file;
  });
}

function removeFileFromTree(files: FileNode[], id: string): FileNode[] {
  return files.filter(file => {
    if (file.id === id) return false;
    if (file.type === 'folder' && file.children) {
      file.children = removeFileFromTree(file.children, id);
    }
    return true;
  });
}