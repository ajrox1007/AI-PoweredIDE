import { FC, useState, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { FileNode } from '@shared/schema';
import { 
  FileText, FolderOpen, Search, GitBranch, 
  Bug, Bot, FolderPlus, PlusCircle, RefreshCw, Trash2,
  FileCode, FileJson, FileType, FileImage, Wand2,
  Loader2,
  Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Define fixed filenames (should match Editor.tsx)
const PROBLEM_FILENAME = 'problem.py';
const README_FILENAME = 'problem_readme.md';

const Sidebar: FC = () => {
  const { 
    files, 
    activeFileId, 
    activeFile,
    selectFile, 
    createNewFile, 
    createNewFolder,
    refreshFiles,
    clearCache,
    addFileWithContent,
    deleteFileById,
    updateFileContent
  } = useFileSystemStore();

  const [activeTab, setActiveTab] = useState<string>('files');
  const [isGeneratingProblem, setIsGeneratingProblem] = useState<boolean>(false);
  const [isInstallingDeps, setIsInstallingDeps] = useState<boolean>(false);

  // --- Generate New Problem Handler with explicit file dependency ---
  const handleGenerateNewProblem = useCallback(async () => {
    console.log('Generating/Updating problem...');
    setIsGeneratingProblem(true);
    try {
      // 1. Fetch new content
      const response = await fetch('/api/generate-problem', { method: 'POST' });
      if (!response.ok) {
        // Consider showing user-friendly error via toast/state
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}`, errorText);
        throw new Error(`Failed to fetch problem: ${response.statusText}`);
      }
      const { pythonCode, readmeContent } = await response.json();

      let problemFileIdToSelect: string | null = null;

      // Use the 'files' state variable from the hook directly
      const existingProblemFile = files.find(f => f.name === PROBLEM_FILENAME);
      const existingReadmeFile = files.find(f => f.name === README_FILENAME);

      // 3. Update or Add Python file
      if (existingProblemFile) {
        console.log('Updating existing problem.py', existingProblemFile.id);
        await updateFileContent(existingProblemFile.id, pythonCode);
        problemFileIdToSelect = existingProblemFile.id;
      } else {
        console.log('Adding new problem.py');
        const newId = await addFileWithContent(PROBLEM_FILENAME, 'python', pythonCode);
        if (newId) {
             problemFileIdToSelect = newId;
        } else {
             console.error('Failed to get ID for newly added problem.py');
        }
      }

      // 4. Update or Add README file
      if (existingReadmeFile) {
        console.log('Updating existing problem_readme.md', existingReadmeFile.id);
        await updateFileContent(existingReadmeFile.id, readmeContent);
      } else {
        console.log('Adding new problem_readme.md');
        await addFileWithContent(README_FILENAME, 'markdown', readmeContent);
      }

      console.log('Problem files generated/updated.');
      
      // 5. Select the problem file (if we have an ID)
      if (problemFileIdToSelect) {
          console.log('Selecting problem file:', problemFileIdToSelect);
          selectFile(problemFileIdToSelect);
      } else {
          console.warn('Could not determine ID of problem.py to select it.');
          // Maybe refresh the whole file list as a fallback?
          // refreshFiles(); 
      }
      
    } catch (error) {
      console.error('Failed to generate/update problem files:', error);
      // Show error to user (e.g., toast)
    } finally {
       setIsGeneratingProblem(false);
    }
  }, [files, selectFile, addFileWithContent, updateFileContent]); 
  // --- End Handler ---

  // --- Install Dependencies Handler ---
  const handleInstallDependencies = useCallback(async () => {
    if (!activeFile || activeFile.language !== 'python') {
      alert('Please open a Python file first.'); // Simple feedback
      return;
    }

    setIsInstallingDeps(true);
    console.log(`Attempting to install dependencies for ${activeFile.name}...`);

    try {
      const code = activeFile.content || '';
      // Regex to find imports (handles 'import x', 'import x as y', 'from x import y')
      // This is a basic regex and might miss complex cases
      const importRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z0-9_.]+)/g;
      const libraries = new Set<string>();
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        // Extract the base module name (e.g., 'pandas' from 'pandas.DataFrame')
        const baseModule = match[1].split('.')[0];
        if (baseModule) {
            libraries.add(baseModule);
        }
      }

      // Basic filtering (example: remove common built-ins or known non-pip packages)
      const commonBuiltins = new Set(['os', 'sys', 'math', 'json', 'datetime', 're', 'collections']);
      // Convert Set to Array explicitly before filtering
      const installableLibs = Array.from(libraries).filter(lib => !commonBuiltins.has(lib));

      if (installableLibs.length > 0) {
        const command = `pip3 install ${installableLibs.join(' ')}`;
        console.log('Dispatching command:', command);
        // Dispatch command to terminal
        window.dispatchEvent(new CustomEvent('terminal:run-command', { detail: { command } }));
        // Give terminal a moment to receive command before resetting state
        await new Promise(resolve => setTimeout(resolve, 200)); 
      } else {
        console.log('No external libraries found to install.');
        // Optionally show a message to the user
      }

    } catch (error) {
      console.error('Error parsing file or dispatching install command:', error);
      // Show error to user
    } finally {
      setIsInstallingDeps(false);
    }
  }, [activeFile]); // Depend on activeFile
  // --- End Handler ---

  const getFileIcon = (file: FileNode) => {
    const iconClass = "h-4 w-4 mr-2 text-muted-foreground flex-shrink-0";
    if (file.type === 'folder') {
      return <FolderOpen className={iconClass} />;
    }
    
    switch(file.language) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
      case 'html':
        return <FileCode className={iconClass} />;
      case 'json':
        return <FileJson className={iconClass} />;
      case 'css':
        return <FileType className={iconClass} />;
      case 'markdown':
        return <FileText className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const renderFileTree = (fileNodes: FileNode[], depth = 0) => {
    return fileNodes.map((file) => (
      <div key={file.id}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-7 py-1 px-2 rounded-sm text-xs font-normal",
            `ml-${depth * 3}`,
            activeFileId === file.id 
              ? 'bg-accent text-accent-foreground' 
              : 'hover:bg-accent/50'
          )}
          onClick={() => {
            if (file.type === 'file') {
              try {
                selectFile(String(file.id));
              } catch (err) {
                console.error('Sidebar: Error selecting file:', err);
              }
            }
          }}
        >
          {getFileIcon(file)}
          <span className="truncate">
            {file.name}
          </span>
        </Button>
        {file.type === 'folder' && file.children && (
           <div className="">
             {renderFileTree(file.children, depth + 1)}
           </div>
        )}
      </div>
    ));
  };

  const iconTabs = [
    { id: 'files', icon: FileText, label: 'Files' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'source', icon: GitBranch, label: 'Source Control' },
    { id: 'debug', icon: Bug, label: 'Debug' },
    { id: 'ai', icon: Bot, label: 'AI Assistant' },
  ];

  return (
    <div className="w-60 bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="flex border-b border-sidebar-border p-1 justify-around">
        {iconTabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              activeTab === tab.id ? "text-accent-foreground bg-sidebar-accent" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <tab.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-2 flex justify-between items-center border-b border-sidebar-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
             {activeTab === 'files' ? 'Explorer' : activeTab.toUpperCase()} 
          </span>
          {activeTab === 'files' && (
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createNewFolder} title="New Folder">
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createNewFile} title="New File">
                <PlusCircle className="h-3.5 w-3.5" />
              </Button>
              <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-6 w-6" 
                 onClick={handleGenerateNewProblem} 
                 title="Generate New Problem"
                 disabled={isGeneratingProblem}
               >
                 {isGeneratingProblem 
                   ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   : <Wand2 className="h-3.5 w-3.5" />
                 } 
               </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleInstallDependencies} 
                title="Install Python Dependencies (pip3)"
                disabled={isInstallingDeps || activeFile?.language !== 'python'}
              >
                {isInstallingDeps 
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />
                } 
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshFiles} title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (window.confirm('This will reset all files to defaults. Continue?')) {
                    clearCache();
                  }
                }}
                title="Reset Files (Clear Cache)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        
        {activeTab === 'files' && (
          <ScrollArea className="flex-1 px-1 py-1">
             {renderFileTree(files)}
          </ScrollArea>
        )}
        {activeTab !== 'files' && (
          <div className="p-4 text-sm text-muted-foreground">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel Content
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
