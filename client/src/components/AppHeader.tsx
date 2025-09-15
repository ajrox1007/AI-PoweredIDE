import { FC, useState, useEffect } from 'react';
import { Cpu, Lock, TerminalSquare, ShieldAlert, Power, GitBranch, BrainCircuit, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AppHeaderProps {
  title: string;
  onTogglePreview: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({ title, onTogglePreview }) => {
  const [timeNow, setTimeNow] = useState<string>('');
  const [status, setStatus] = useState<string>('SECURE');

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      // Randomly change status for demo effect
      if (Math.random() < 0.02) {
        setStatus(prev => prev === 'SECURE' ? 'BREACH' : 'SECURE');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <header className="h-10 bg-background border-b border-border flex items-center px-4 text-sm font-mono">
      {/* Left section: Icon Logo */}
      <div className="flex items-center gap-2" title={title}>
        <BrainCircuit className="text-primary h-6 w-6" />
      </div>
      
      {/* Center section: Status indicators (simplified) */}
      <div className="flex-1 flex justify-center items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">TIME:</span>
          <span className="text-foreground font-medium">{timeNow}</span>
        </div>
        <Separator orientation="vertical" className="h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">STATUS:</span>
          <span className={`font-medium ${status === 'SECURE' ? 'text-green-500' : 'text-red-500 animate-pulse'}`}>
            {status}
          </span>
        </div>
         <Separator orientation="vertical" className="h-4 bg-border" />
        <div className="flex items-center gap-1.5">
           <span className="text-muted-foreground">AI:</span>
          <span className="text-green-500 font-medium">ACTIVE</span>
        </div>
      </div>
      
      {/* Right controls: Use Shadcn Buttons */}
      <div className="flex items-center gap-1">
        {/* Add the Preview Toggle Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7" 
          title="Toggle Preview Panel" 
          onClick={onTogglePreview}
        >
          <Play className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4 bg-border mx-1" />
        {/* Example Buttons - replace with actual functionality */}
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Git Control (Example)">
          <GitBranch className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Security (Example)">
          <ShieldAlert className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" title="Power Off (Example)">
          <Power className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
