import { FC, useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore';
import { GitBranch, LucideWifi, Shield, Cpu, Zap, Lock, Braces } from 'lucide-react';

const StatusBar: FC = () => {
  const { editorPosition } = useEditorStore();
  const { activeFile } = useFileSystemStore();
  const { aiStatus } = useAiStore();
  
  const [cpuLoad, setCpuLoad] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  
  // Simulate changing metrics for dynamic feel
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * 85) + 15);
      setMemoryUsage(Math.floor(Math.random() * 50) + 50);
      setLatency(Math.floor(Math.random() * 20) + 5);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Get language icon
  const getLanguageIcon = () => {
    if (!activeFile?.language) return null;
    
    switch(activeFile.language) {
      case 'javascript':
        return <span className="text-yellow-400 font-bold">JS</span>;
      case 'typescript':
        return <span className="text-blue-400 font-bold">TS</span>;
      case 'jsx':
      case 'tsx':
        return <span className="text-cyan-400 font-bold">JSX</span>;
      case 'css':
        return <span className="text-pink-400 font-bold">CSS</span>;
      case 'html':
        return <span className="text-orange-400 font-bold">HTML</span>;
      default:
        return null;
    }
  };
  
  // Get AI status color based on status
  const getAiStatusColor = () => {
    if (aiStatus.includes('Idle') || aiStatus === '') return 'text-muted-foreground';
    if (aiStatus.includes('Error') || aiStatus.includes('Failed')) return 'text-red-500';
    return 'neon-green';
  };

  return (
    <footer className="h-7 border-t border-primary/30 px-2 flex items-center justify-between text-[10px] bg-background/80 backdrop-blur relative overflow-hidden">
      {/* Grid overlay for cyberpunk effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(rgba(75, 75, 100, 0.3) 1px, transparent 1px)`,
          backgroundSize: '4px 4px'
        }}>
      </div>
      
      {/* Status indicators with cyberpunk styling */}
      <div className="flex items-center z-10 space-x-4">
        {/* Branch indicator */}
        <div className="flex items-center space-x-1 px-1 border-r border-primary/20">
          <GitBranch className="h-3 w-3 text-primary" />
          <span className="font-mono">MAIN</span>
        </div>
        
        {/* Language indicator */}
        <div className="flex items-center space-x-1">
          <Braces className="h-3 w-3 text-primary" />
          <div className="flex items-center space-x-1 font-mono">
            {getLanguageIcon()}
            <span>{activeFile?.language?.toUpperCase() || 'NO FILE'}</span>
          </div>
        </div>
      </div>
      
      {/* Center indicators - dynamic usage stats */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-10">
        <div className="flex items-center space-x-1">
          <Cpu className="h-3 w-3 text-primary" />
          <div className="w-20 h-2 bg-gray-800 rounded-sm overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary/70 to-primary"
              style={{ width: `${cpuLoad}%` }}
            ></div>
          </div>
          <span className="font-mono">{cpuLoad}%</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3 text-primary" />
          <span className="font-mono neon-cyan">{latency} ms</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Shield className={`h-3 w-3 ${aiStatus ? 'text-green-500' : 'text-gray-500'}`} />
          <span className={`font-mono ${getAiStatusColor()}`}>
            {aiStatus || 'AI OFFLINE'}
          </span>
        </div>
      </div>
      
      {/* Right indicators - editor stats */}
      <div className="flex items-center space-x-3 z-10">
        <div className="font-mono px-1 border-l border-primary/20">
          Ln <span className="neon-blue">{editorPosition?.lineNumber || 0}</span>
          {' '}Col <span className="neon-blue">{editorPosition?.column || 0}</span>
        </div>
        
        <div className="font-mono flex items-center">
          <LucideWifi className="h-3 w-3 mr-1 text-primary" />
          <span>SYNC</span>
        </div>
        
        <div className="font-mono flex items-center">
          <Lock className="h-3 w-3 mr-1 text-primary" />
          <span>SECURE</span>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
