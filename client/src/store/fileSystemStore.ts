import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { FileNode } from '@shared/schema';
import { saveFile, loadFiles, createFile, createFolder, deleteFile } from '@/lib/fileSystem';

interface FileSystemState {
  files: FileNode[];
  activeFileId: string | null;
  activeFiles: FileNode[];
  activeFile: FileNode | null;
  
  // Actions
  loadSavedFiles: () => Promise<void>;
  selectFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  createNewFile: () => void;
  createNewFolder: () => void;
  deleteFileById: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  refreshFiles: () => Promise<void>;
}

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      activeFiles: [],
      activeFile: null,
      
      loadSavedFiles: async () => {
        try {
          const savedFiles = await loadFiles();
          if (savedFiles && savedFiles.length > 0) {
            set({ files: savedFiles });
          } else {
            // Create default files if none exist
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
            
            set({ files: defaultFiles });
            
            // Save default files to storage
            for (const file of defaultFiles) {
              await saveFile(file);
            }
          }
        } catch (error) {
          console.error('Failed to load files:', error);
        }
      },
      
      selectFile: (fileId: string) => {
        const file = findFileById(get().files, fileId);
        
        if (file && file.type === 'file') {
          // Check if file is already in activeFiles
          const isFileActive = get().activeFiles.some(f => f.id === fileId);
          
          if (!isFileActive) {
            set(state => ({
              activeFiles: [...state.activeFiles, file],
              activeFileId: fileId,
              activeFile: file
            }));
          } else {
            set({
              activeFileId: fileId,
              activeFile: file
            });
          }
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
        if (!fileName) return;
        
        try {
          const fileExtension = fileName.split('.').pop() || 'txt';
          let language = 'plaintext';
          
          // Map common extensions to languages
          switch(fileExtension) {
            case 'js': language = 'javascript'; break;
            case 'ts': language = 'typescript'; break;
            case 'jsx': language = 'jsx'; break;
            case 'tsx': language = 'tsx'; break;
            case 'css': language = 'css'; break;
            case 'html': language = 'html'; break;
            case 'json': language = 'json'; break;
            case 'md': language = 'markdown'; break;
            case 'py': language = 'python'; break;
          }
          
          const newFile: FileNode = {
            id: uuidv4(),
            name: fileName,
            path: `/${fileName}`,
            type: 'file',
            language,
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await createFile(newFile);
          
          set(state => ({
            files: [...state.files, newFile],
            activeFileId: newFile.id,
            activeFiles: [...state.activeFiles, newFile],
            activeFile: newFile
          }));
        } catch (error) {
          console.error('Failed to create file:', error);
        }
      },
      
      createNewFolder: async () => {
        const folderName = prompt('Enter folder name:', 'new-folder');
        if (!folderName) return;
        
        try {
          const newFolder: FileNode = {
            id: uuidv4(),
            name: folderName,
            path: `/${folderName}`,
            type: 'folder',
            children: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await createFolder(newFolder);
          
          set(state => ({
            files: [...state.files, newFolder]
          }));
        } catch (error) {
          console.error('Failed to create folder:', error);
        }
      },
      
      deleteFileById: async (fileId: string) => {
        try {
          await deleteFile(fileId);
          
          // Remove from activeFiles if present
          if (get().activeFileId === fileId) {
            get().closeFile(fileId);
          }
          
          // Update files array
          set(state => ({
            files: removeFileFromTree(state.files, fileId)
          }));
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      },
      
      updateFileContent: (fileId: string, content: string) => {
        const updatedFiles = updateFileInTree(get().files, fileId, { content, updatedAt: new Date().toISOString() });
        
        // Update activeFile if it's the current file
        let updatedActiveFile = get().activeFile;
        if (updatedActiveFile && updatedActiveFile.id === fileId) {
          updatedActiveFile = { ...updatedActiveFile, content, updatedAt: new Date().toISOString() };
        }
        
        // Update activeFiles list
        const updatedActiveFiles = get().activeFiles.map(file => 
          file.id === fileId 
            ? { ...file, content, updatedAt: new Date().toISOString() } 
            : file
        );
        
        set({
          files: updatedFiles,
          activeFile: updatedActiveFile,
          activeFiles: updatedActiveFiles
        });
        
        // Persist to storage
        const file = findFileById(updatedFiles, fileId);
        if (file) {
          saveFile(file);
        }
      },
      
      refreshFiles: async () => {
        await get().loadSavedFiles();
      }
    }),
    {
      name: 'file-system-storage',
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
        activeFiles: state.activeFiles.map(file => file.id) // Store only IDs to avoid circular references
      })
    }
  )
);

// Helper functions for file tree operations
function findFileById(files: FileNode[], id: string): FileNode | null {
  for (const file of files) {
    if (file.id === id) return file;
    if (file.type === 'folder' && file.children) {
      const found = findFileById(file.children, id);
      if (found) return found;
    }
  }
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
