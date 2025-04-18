import { FC, useState, useRef, useEffect } from 'react';
import { useAiStore } from '@/store/aiStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';

interface AIChatPanelProps {
  onClose: () => void;
}

const AIChatPanel: FC<AIChatPanelProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const { activeFile } = useFileSystemStore();
  const { chatMessages, sendChatMessage, isLoading } = useAiStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendChatMessage(input, activeFile?.id);
      setInput('');
    }
  };

  // Handle Enter key to send message (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="h-9 flex items-center justify-between border-b border-border px-4">
        <h3 className="text-sm font-medium">AI Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <span className="material-icons text-sm">close</span>
        </Button>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 text-sm space-y-4">
        {chatMessages.map((message, index) => (
          <div key={index} className="flex gap-2">
            <div 
              className={`shrink-0 w-6 h-6 rounded-full ${
                message.role === 'assistant' 
                  ? 'bg-primary' 
                  : message.role === 'system' 
                    ? 'bg-accent-green' 
                    : 'bg-accent/20'
              } flex items-center justify-center`}
            >
              <span 
                className={`material-icons ${
                  message.role === 'assistant' || message.role === 'system'
                    ? 'text-white'
                    : 'text-foreground'
                } text-xs`}
              >
                {message.role === 'assistant' || message.role === 'system' ? 'smart_toy' : 'person'}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-foreground">
                {message.role === 'assistant' ? 'AI Assistant' : message.role === 'system' ? 'System' : 'You'}
              </div>
              <div className="text-foreground whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-2">
            <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="material-icons text-white text-xs">smart_toy</span>
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-foreground">AI Assistant</div>
              <div className="text-foreground">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-3 border-t border-border">
        <div className="bg-background rounded border border-border p-2 flex">
          <Textarea 
            className="bg-transparent resize-none flex-1 focus:outline-none text-sm min-h-[50px]"
            placeholder="Ask a question about your code..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="self-end text-primary"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <span className="material-icons">send</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default AIChatPanel;
