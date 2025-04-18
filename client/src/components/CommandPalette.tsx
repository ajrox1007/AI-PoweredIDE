import { FC, useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useAiStore } from '@/store/aiStore';

interface CommandSuggestion {
  id: string;
  icon: string;
  iconColor?: string;
  label: string;
  type: 'ai' | 'editor';
  action: () => void;
}

const CommandPalette: FC = () => {
  const { toggleCommandPalette } = useEditorStore();
  const { generateTests, explainCode, refactorCode, findBugs } = useAiStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Command suggestions
  const suggestions: CommandSuggestion[] = [
    {
      id: 'generate-tests',
      icon: 'auto_fix_high',
      iconColor: 'text-primary',
      label: 'Generate tests for current file',
      type: 'ai',
      action: () => {
        generateTests();
        toggleCommandPalette();
      }
    },
    {
      id: 'explain-code',
      icon: 'psychology',
      iconColor: 'text-accent-purple',
      label: 'Explain selected code',
      type: 'ai',
      action: () => {
        explainCode();
        toggleCommandPalette();
      }
    },
    {
      id: 'refactor-code',
      icon: 'build',
      iconColor: 'text-accent-green',
      label: 'Refactor selected code',
      type: 'ai',
      action: () => {
        refactorCode();
        toggleCommandPalette();
      }
    },
    {
      id: 'find-bugs',
      icon: 'bug_report',
      iconColor: 'text-accent-yellow',
      label: 'Find and fix bugs',
      type: 'ai',
      action: () => {
        findBugs();
        toggleCommandPalette();
      }
    },
    {
      id: 'format-document',
      icon: 'format_align_left',
      label: 'Format document',
      type: 'editor',
      action: () => {
        // Format document logic
        toggleCommandPalette();
      }
    },
    {
      id: 'find-replace',
      icon: 'find_replace',
      label: 'Find and replace',
      type: 'editor',
      action: () => {
        // Find and replace logic
        toggleCommandPalette();
      }
    }
  ];

  // Filter suggestions based on search query
  useEffect(() => {
    const filtered = suggestions.filter(suggestion => 
      suggestion.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSuggestions(filtered);
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          filteredSuggestions[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        toggleCommandPalette();
        break;
    }
  };

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      toggleCommandPalette();
    }
  };

  return (
    <div 
      className="fixed inset-0 cmd-k-overlay z-50 flex items-start justify-center pt-24"
      onClick={handleOverlayClick}
    >
      <div className="bg-sidebar border border-border rounded-lg shadow-xl w-[600px]">
        <div className="p-3 border-b border-border">
          <div className="flex items-center bg-background rounded px-3 py-2">
            <span className="material-icons text-muted-foreground mr-2">search</span>
            <input 
              ref={inputRef}
              type="text" 
              className="bg-transparent border-none w-full focus:outline-none" 
              placeholder="Type a command or search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto p-1">
          {/* AI Actions */}
          {filteredSuggestions.some(s => s.type === 'ai') && (
            <div className="px-3 py-1 text-xs text-muted-foreground uppercase">AI Actions</div>
          )}
          
          {filteredSuggestions.filter(s => s.type === 'ai').map((suggestion, index) => (
            <div 
              key={suggestion.id}
              className={`px-3 py-2 flex items-center hover:bg-accent/10 rounded cursor-pointer ${
                index === selectedIndex ? 'bg-accent/20' : ''
              }`}
              onClick={suggestion.action}
            >
              <span className={`material-icons ${suggestion.iconColor || 'text-muted-foreground'} mr-2`}>
                {suggestion.icon}
              </span>
              <span>{suggestion.label}</span>
            </div>
          ))}
          
          {/* Editor Commands */}
          {filteredSuggestions.some(s => s.type === 'editor') && (
            <div className="mt-2 px-3 py-1 text-xs text-muted-foreground uppercase">Editor Commands</div>
          )}
          
          {filteredSuggestions.filter(s => s.type === 'editor').map((suggestion, index) => (
            <div 
              key={suggestion.id}
              className={`px-3 py-2 flex items-center hover:bg-accent/10 rounded cursor-pointer ${
                index + filteredSuggestions.filter(s => s.type === 'ai').length === selectedIndex ? 'bg-accent/20' : ''
              }`}
              onClick={suggestion.action}
            >
              <span className="material-icons text-muted-foreground mr-2">{suggestion.icon}</span>
              <span>{suggestion.label}</span>
            </div>
          ))}
          
          {filteredSuggestions.length === 0 && (
            <div className="px-3 py-4 text-center text-muted-foreground">
              No matching commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
