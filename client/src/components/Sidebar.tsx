import { FC, useState, useEffect } from 'react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { FileNode } from '@shared/schema';
import { 
  FileText, FolderOpen, Search, GitBranch, 
  Bug, Package, PlusCircle, FolderPlus, RefreshCw,
  FileCode, FileJson, FileType, FileImage, 
  Database, Cpu, FileCog, Bot
} from 'lucide-react';

const Sidebar: FC = () => {
  const { 
    files, 
    activeFileId, 
    selectFile, 
    createNewFile, 
    createNewFolder,
    refreshFiles 
  } = useFileSystemStore();

  const [activeTab, setActiveTab] = useState<string>('files');
  const [scanLine, setScanLine] = useState<number>(0);
  
  // Create scan line effect in file tree
  useEffect(() => {
    const interval = setInterval(() => {
      setScanLine(prev => (prev + 1) % 50); // Cycle through files
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      return <FolderOpen className="h-4 w-4 mr-1 text-primary/60" />;
    }
    
    // Map file extensions to icons
    switch(file.language) {
      case 'javascript':
        return <FileCode className="h-4 w-4 mr-1 neon-pink" />;
      case 'typescript':
        return <FileCode className="h-4 w-4 mr-1 neon-blue" />;
      case 'jsx':
      case 'tsx':
        return <FileCode className="h-4 w-4 mr-1 neon-blue" />;
      case 'css':
        return <FileType className="h-4 w-4 mr-1 neon-green" />;
      case 'html':
        return <FileCode className="h-4 w-4 mr-1 neon-green" />;
      case 'json':
        return <FileJson className="h-4 w-4 mr-1 neon-pink" />;
      case 'markdown':
        return <FileText className="h-4 w-4 mr-1 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 mr-1 text-muted-foreground" />;
    }
  };

  const renderFileTree = (fileNodes: FileNode[], depth = 0) => {
    return fileNodes.map((file, index) => (
      <div key={file.id} className="relative">
        {/* Add a scan line effect */}
        {scanLine === index && (
          <div className="absolute h-[1px] w-full bg-primary/20 z-10"></div>
        )}
        
        {/* File or folder item */}
        <div 
          className={`py-1 px-3 ml-${depth * 3} my-[2px] flex items-center rounded-sm cursor-pointer 
            ${activeFileId === file.id 
              ? 'bg-primary/20 text-primary neon-text' 
              : 'hover:bg-background/20'}`}
          onClick={() => file.type === 'file' ? selectFile(file.id) : undefined}
        >
          {getFileIcon(file)}
          <span className={`text-xs ${activeFileId === file.id ? 'neon-text' : ''}`}>
            {file.name}
          </span>
          
          {/* Highlight for active file */}
          {activeFileId === file.id && (
            <div className="absolute left-0 h-full w-[2px] bg-primary"></div>
          )}
        </div>
        
        {file.type === 'folder' && file.children && renderFileTree(file.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="w-64 border-r border-primary/30 flex flex-col relative overflow-hidden cyberpunk-box">
      {/* Background grid and effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(rgba(75, 75, 100, 0.3) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(75, 75, 100, 0.3) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}>
      </div>
      
      {/* Sidebar Tabs */}
      <div className="h-10 flex items-center justify-around border-b border-primary/40 text-muted-foreground backdrop-blur-sm z-10">
        <button 
          className={`p-2 h-full flex items-center justify-center transition-colors duration-200 ${activeTab === 'files' ? 'border-b-2 border-primary neon-pink' : 'border-b-2 border-transparent hover:border-primary/30'}`}
          onClick={() => setActiveTab('files')}
        >
          <FileText className="h-4 w-4" />
        </button>
        
        <button 
          className={`p-2 h-full flex items-center justify-center transition-colors duration-200 ${activeTab === 'search' ? 'border-b-2 border-primary neon-blue' : 'border-b-2 border-transparent hover:border-primary/30'}`}
          onClick={() => setActiveTab('search')}
        >
          <Search className="h-4 w-4" />
        </button>
        
        <button 
          className={`p-2 h-full flex items-center justify-center transition-colors duration-200 ${activeTab === 'source' ? 'border-b-2 border-primary neon-green' : 'border-b-2 border-transparent hover:border-primary/30'}`}
          onClick={() => setActiveTab('source')}
        >
          <GitBranch className="h-4 w-4" />
        </button>
        
        <button 
          className={`p-2 h-full flex items-center justify-center transition-colors duration-200 ${activeTab === 'debug' ? 'border-b-2 border-primary neon-cyan' : 'border-b-2 border-transparent hover:border-primary/30'}`}
          onClick={() => setActiveTab('debug')}
        >
          <Bug className="h-4 w-4" />
        </button>
        
        <button 
          className={`p-2 h-full flex items-center justify-center transition-colors duration-200 ${activeTab === 'ai' ? 'border-b-2 border-primary neon-purple' : 'border-b-2 border-transparent hover:border-primary/30'}`}
          onClick={() => setActiveTab('ai')}
        >
          <Bot className="h-4 w-4" />
        </button>
      </div>
      
      {/* Explorer panel */}
      <div className="flex-1 overflow-auto z-10">
        <div className="px-4 py-2 flex justify-between items-center text-xs font-bold tracking-widest relative">
          {/* Title with futuristic decoration */}
          <div className="flex items-center">
            <div className="h-3 w-3 border-l-2 border-t-2 border-primary/80 -ml-2 mr-1"></div>
            <span className="text-primary neon-text">EXPLORER</span>
            <div className="h-3 w-3 border-r-2 border-b-2 border-primary/80 ml-1"></div>
          </div>
          
          {/* Controls with cyberpunk styling */}
          <div className="flex space-x-1">
            <button 
              className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300"
              onClick={createNewFolder}
              title="New Folder"
            >
              <FolderPlus className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
            </button>
            
            <button 
              className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300"
              onClick={createNewFile}
              title="New File"
            >
              <PlusCircle className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
            </button>
            
            <button 
              className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300"
              onClick={refreshFiles}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
            </button>
          </div>
        </div>
        
        {/* Decorative line */}
        <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        
        {/* File Tree with cyberpunk styling */}
        <div className="mt-3 pb-5 relative">
          {/* Vertical scan line effect */}
          <div className="absolute h-full w-[1px] left-3 top-0 bg-primary/10"></div>
          
          {renderFileTree(files)}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
