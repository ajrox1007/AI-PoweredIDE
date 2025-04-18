import React, { FC, useRef, useEffect, useState } from 'react';
import { useAiStore } from '@/store/aiStore';
import { Button } from '@/components/ui/button';

interface AIActionsMenuProps {
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
}

const AIActionsMenu: FC<AIActionsMenuProps> = ({ x, y, selectedText, onClose }) => {
  const { generateTests, explainCode, refactorCode, findBugs } = useAiStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Wait for animation to finish
  };
  
  const handleAction = (action: () => Promise<void>) => {
    action();
    handleClose();
  };
  
  if (!isVisible) return null;
  
  return (
    <div 
      ref={menuRef}
      className="absolute z-50 bg-background border border-border rounded-lg shadow-md p-2 w-48 transition-opacity duration-200"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`, 
        opacity: isVisible ? 1 : 0,
        transform: `translate(-50%, ${isVisible ? '0' : '-10px'})`,
      }}
    >
      <div className="text-xs font-medium text-foreground/70 px-2 py-1 border-b border-border mb-1">
        AI Actions
      </div>
      
      <div className="space-y-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs"
          onClick={() => handleAction(explainCode)}
        >
          <span className="material-icons text-primary mr-2 text-sm">description</span>
          Explain Code
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs"
          onClick={() => handleAction(refactorCode)}
        >
          <span className="material-icons text-primary mr-2 text-sm">code</span>
          Refactor Code
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs"
          onClick={() => handleAction(findBugs)}
        >
          <span className="material-icons text-primary mr-2 text-sm">bug_report</span>
          Find Bugs
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs"
          onClick={() => handleAction(generateTests)}
        >
          <span className="material-icons text-primary mr-2 text-sm">science</span>
          Generate Tests
        </Button>
      </div>
    </div>
  );
};

export default AIActionsMenu;