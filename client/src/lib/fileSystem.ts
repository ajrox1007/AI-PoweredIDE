import { FileNode } from '@shared/schema';
import localforage from 'localforage';

// Initialize IndexedDB store
const fileStore = localforage.createInstance({
  name: 'aiCodeEditor',
  storeName: 'files'
});

/**
 * Save a file to IndexedDB
 */
export async function saveFile(file: FileNode): Promise<void> {
  try {
    await fileStore.setItem(file.id, file);
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

/**
 * Load all files from IndexedDB
 */
export async function loadFiles(): Promise<FileNode[]> {
  try {
    const files: FileNode[] = [];
    await fileStore.iterate((value: FileNode) => {
      files.push(value);
    });
    return files;
  } catch (error) {
    console.error('Error loading files:', error);
    throw error;
  }
}

/**
 * Create a new file and save to IndexedDB
 */
export async function createFile(file: FileNode): Promise<void> {
  try {
    await saveFile(file);
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
}

/**
 * Create a new folder and save to IndexedDB
 */
export async function createFolder(folder: FileNode): Promise<void> {
  try {
    await saveFile(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

/**
 * Delete a file from IndexedDB
 */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await fileStore.removeItem(fileId);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get a file by ID from IndexedDB
 */
export async function getFile(fileId: string): Promise<FileNode | null> {
  try {
    return await fileStore.getItem(fileId);
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
}

/**
 * Export all files as a JSON file
 */
export async function exportFiles(): Promise<string> {
  try {
    const files = await loadFiles();
    const blob = new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-code-editor-files.json';
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    return url;
  } catch (error) {
    console.error('Error exporting files:', error);
    throw error;
  }
}

/**
 * Import files from a JSON file
 */
export async function importFiles(jsonString: string): Promise<void> {
  try {
    const files = JSON.parse(jsonString) as FileNode[];
    
    // Clear existing files
    await fileStore.clear();
    
    // Import new files
    for (const file of files) {
      await saveFile(file);
    }
  } catch (error) {
    console.error('Error importing files:', error);
    throw error;
  }
}
