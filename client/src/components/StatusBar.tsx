import { FC } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useAiStore } from '@/store/aiStore';
import { GitBranch, Zap, CheckCircle, XCircle, AlertCircle, BrainCircuit, Lock, FileText, Bot, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  toggleAiPanel: () => void;
  isAiPanelVisible: boolean;
}

const StatusBar: FC<StatusBarProps> = ({ toggleAiPanel, isAiPanelVisible }) => {
  const { editorPosition } = useEditorStore();
  const { activeFile } = useFileSystemStore();
  const { aiStatus, isLoading } = useAiStore();

  const getAiStatus = () => {
    if (isLoading) return { text: 'THINKING', color: 'text-blue-400 animate-pulse', icon: <BrainCircuit className="h-3.5 w-3.5 mr-1" /> };
    if (aiStatus.includes('Error') || aiStatus.includes('Failed')) return { text: 'ERROR', color: 'text-red-500', icon: <XCircle className="h-3.5 w-3.5 mr-1" /> };
    if (aiStatus === 'Ready') return { text: 'READY', color: 'text-green-500', icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> };
    return { text: aiStatus.toUpperCase(), color: 'text-yellow-500', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> };
  };

  const { text: aiText, color: aiColor, icon: aiIcon } = getAiStatus();

  return (
    <footer className="h-6 bg-background border-t border-border px-3 flex items-center justify-between text-xs text-muted-foreground font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 hover:text-foreground cursor-pointer" title="Source Control (Main Branch)">
          <GitBranch className="h-3.5 w-3.5" />
          <span>main</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {activeFile && (
            <div className="flex items-center gap-1 hover:text-foreground cursor-pointer" title="File Language">
                <FileText className="h-3.5 w-3.5" />
                <span>{activeFile.language ? activeFile.language.toUpperCase() : 'TEXT'}</span>
            </div>
        )}
        <div className="flex items-center gap-1" title="Cursor Position">
          <span>Ln {editorPosition?.lineNumber ?? 0}, Col {editorPosition?.column ?? 0}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-border mx-1" />
        <div className={cn("flex items-center gap-1", aiColor)} title={`AI Status: ${aiText}`}>
          {aiIcon}
          <span>{aiText}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-border mx-1" />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-muted-foreground hover:bg-muted/50 hover:text-foreground data-[state=open]:bg-muted/80"
                onClick={toggleAiPanel}
                data-state={isAiPanelVisible ? 'open' : 'closed'}
              >
                <Bot className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>{isAiPanelVisible ? 'Hide AI Panel' : 'Show AI Panel'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Separator orientation="vertical" className="h-3 bg-border mx-1" />
         <div className="flex items-center gap-1 hover:text-foreground cursor-pointer" title="Connection Status">
          <Lock className="h-3.5 w-3.5" /> 
          <span>Secure</span> 
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
