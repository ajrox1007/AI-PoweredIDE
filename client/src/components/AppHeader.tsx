import { FC, useState, useEffect } from 'react';
import { AlertTriangle, Lock, Cpu, TerminalSquare, Power, ShieldAlert } from 'lucide-react';

interface AppHeaderProps {
  title: string;
}

const AppHeader: FC<AppHeaderProps> = ({ title }) => {
  const [timeNow, setTimeNow] = useState<string>('');
  const [securityStatus, setSecurityStatus] = useState<string>('SECURE');
  const [glitching, setGlitching] = useState<boolean>(false);
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const date = new Date();
      setTimeNow(
        date.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
      
      // Random glitch effect
      if (Math.random() < 0.01) {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 500);
        
        // Randomly change security status during glitch
        if (Math.random() < 0.3) {
          setSecurityStatus(Math.random() < 0.5 ? 'BREACH' : 'SECURE');
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <header className="h-10 bg-sidebar border-b border-primary flex items-center px-3 text-sm backdrop-blur-sm relative overflow-hidden">
      {/* Digital grid overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(rgba(75, 75, 100, 0.3) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(75, 75, 100, 0.3) 1px, transparent 1px)`,
          backgroundSize: '8px 8px'
        }}>
      </div>
      
      {/* Horizontal scan line effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute h-[1px] w-full bg-primary/30 animate-[scan_2s_linear_infinite]"></div>
      </div>
      
      {/* Logo and title */}
      <div className="flex items-center z-10">
        <Cpu className="text-primary mr-2 h-5 w-5 neon-text neon-pink" />
        <span className={`font-medium tracking-wider ${glitching ? 'glitch-text' : 'neon-text neon-pink'}`}>
          {title.toUpperCase()}
        </span>
      </div>
      
      {/* Center section - status indicators */}
      <div className="flex-1 flex justify-center items-center gap-6 z-10">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">SYS.TIME:</span>
          <span className="text-xs font-bold neon-blue neon-text">{timeNow}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">STATUS:</span>
          <span className={`text-xs font-bold ${securityStatus === 'SECURE' ? 'text-green-400' : 'text-red-500 animate-pulse'}`}>
            {securityStatus}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">AI.SYS:</span>
          <span className="text-xs font-bold neon-green neon-text">ACTIVE</span>
        </div>
      </div>
      
      {/* Right controls */}
      <div className="flex items-center gap-3 z-10">
        <button className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300">
          <Lock className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
        </button>
        
        <button className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300">
          <TerminalSquare className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
        </button>
        
        <button className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300">
          <ShieldAlert className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
        </button>
        
        <button className="p-1 rounded-sm hover:bg-primary/10 group transition-all duration-300">
          <Power className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
