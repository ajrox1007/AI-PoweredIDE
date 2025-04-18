import { FC } from 'react';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { FileNode } from '@shared/schema';

const Sidebar: FC = () => {
  const { 
    files, 
    activeFileId, 
    selectFile, 
    createNewFile, 
    createNewFolder,
    refreshFiles 
  } = useFileSystemStore();

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') return 'folder';
    
    // Map file extensions to icons
    switch(file.language) {
      case 'javascript':
        return 'javascript';
      case 'typescript':
        return 'code';
      case 'jsx':
      case 'tsx':
        return 'code';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'data_object';
      case 'markdown':
        return 'description';
      default:
        return 'description';
    }
  };

  const getFileIconColor = (file: FileNode) => {
    if (file.type === 'folder') return 'text-muted-foreground';
    
    switch(file.language) {
      case 'javascript':
        return 'text-primary';
      case 'typescript':
        return 'text-primary';
      case 'jsx':
      case 'tsx':
        return 'text-accent-green';
      case 'css':
        return 'text-accent-purple';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderFileTree = (fileNodes: FileNode[], depth = 0) => {
    return fileNodes.map(file => (
      <div key={file.id}>
        <div 
          className={`px-${4 + depth * 3} py-1 flex items-center hover:bg-accent/10 rounded cursor-pointer ${activeFileId === file.id ? 'bg-accent/20 text-foreground' : ''}`}
          onClick={() => file.type === 'file' ? selectFile(file.id) : undefined}
        >
          <span className={`material-icons ${getFileIconColor(file)} mr-1 text-sm`}>
            {getFileIcon(file)}
          </span>
          <span>{file.name}</span>
        </div>
        
        {file.type === 'folder' && file.children && renderFileTree(file.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="w-64 bg-sidebar border-r border-border flex flex-col">
      {/* Sidebar Tabs */}
      <div className="h-10 flex items-center border-b border-border px-2 text-muted-foreground">
        <button className="p-1 rounded hover:bg-accent/10 mr-1">
          <span className="material-icons text-xl">description</span>
        </button>
        <button className="p-1 rounded hover:bg-accent/10 mr-1">
          <span className="material-icons text-xl">search</span>
        </button>
        <button className="p-1 rounded hover:bg-accent/10 mr-1">
          <span className="material-icons text-xl">source</span>
        </button>
        <button className="p-1 rounded hover:bg-accent/10 mr-1">
          <span className="material-icons text-xl">bug_report</span>
        </button>
        <button className="p-1 rounded hover:bg-accent/10">
          <span className="material-icons text-xl">extension</span>
        </button>
      </div>
      
      {/* Explorer panel */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 flex justify-between items-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <span>Explorer</span>
          <div className="flex">
            <button 
              className="p-1 rounded hover:bg-accent/10"
              onClick={createNewFolder}
            >
              <span className="material-icons text-sm">create_new_folder</span>
            </button>
            <button 
              className="p-1 rounded hover:bg-accent/10"
              onClick={createNewFile}
            >
              <span className="material-icons text-sm">note_add</span>
            </button>
            <button 
              className="p-1 rounded hover:bg-accent/10"
              onClick={refreshFiles}
            >
              <span className="material-icons text-sm">refresh</span>
            </button>
          </div>
        </div>
        
        {/* File Tree */}
        <div className="text-sm">
          {renderFileTree(files)}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
