import { FC, useState, useRef, useEffect } from 'react';
import { useAiStore } from '@/store/aiStore';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, Loader2, X, MessageSquare, Code } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

interface AIChatPanelProps {
  onClose: () => void;
}

// Define a readable sans-serif font stack
const sansSerifFontStack = `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`;

// Define gradient colors based on inspiration
const gradientStart = 'hsl(260, 50%, 10%)'; // Dark Purple
const gradientMid = 'hsl(230, 50%, 12%)';   // Dark Blueish
const gradientEnd = 'hsl(var(--background))'; // Base dark background

const AIChatPanel: FC<AIChatPanelProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const { activeFile } = useFileSystemStore();
  const { 
    chatMessages, 
    sendChatMessage, 
    isLoading, 
    aiStatus, 
    selectedCodeForChat, 
    isWaitingForFixInstructions, 
    submitFixRequest 
  } = useAiStore();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle safe closing of the panel
  const handleSafeClose = () => {
    // Only close if not currently loading or executing an operation
    if (!isLoading && !isWaitingForFixInstructions) {
      onClose();
    } else {
      // If an operation is in progress, show a warning and don't close
      console.warn('Cannot close AI panel during an active operation');
      // Optionally show a temporary tooltip or notification here
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Get the viewport element within the ScrollArea
      const scrollViewport = scrollAreaRef.current.querySelector<HTMLDivElement>(':scope > div');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [chatMessages, isLoading]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      if (isWaitingForFixInstructions) {
        submitFixRequest(input);
      } else {
        sendChatMessage(input, activeFile?.id);
      }
      setInput('');
    }
  };

  // Handle Enter key to send message (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card 
      className="flex flex-col h-full w-full border-l border-border rounded-none shadow-none overflow-hidden"
      style={{
        fontFamily: sansSerifFontStack,
        background: `linear-gradient(135deg, ${gradientStart}, ${gradientMid}, ${gradientEnd})`
      }}
    >
      <CardHeader 
        className="flex flex-row items-center justify-between py-3 px-4 border-b border-white/10 bg-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-700 border-2 border-border shadow-md">
                <AvatarFallback className="bg-transparent">
                  <Bot size={16} className="text-white" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></span>
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">AI Assistant</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by Claude 3.7</p>
            </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-full",
            (isLoading || isWaitingForFixInstructions) && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleSafeClose}
          disabled={isLoading || isWaitingForFixInstructions}
          title={isLoading || isWaitingForFixInstructions ? "Cannot close during an active operation" : "Close AI panel"}
        >
          <X size={16} />
          <span className="sr-only">Close</span>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-3">
            {chatMessages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center pt-12 pb-8 px-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-full flex items-center justify-center mb-4 shadow-lg border-2 border-border">
                        <Bot size={28} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to CodeCraft AI</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">I can help you understand, fix, or optimize your code. Ask me anything!</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                        {[
                            { title: "Explain Code", desc: "What does this function do?" },
                            { title: "Fix Bugs", desc: "Why isn't this working correctly?" }, 
                            { title: "Optimize Code", desc: "How can I make this more efficient?" },
                            { title: "Suggest Features", desc: "What improvements would you recommend?" }
                        ].map((suggestion, i) => (
                            <button 
                                key={i}
                                className="text-left p-3 rounded-lg bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors"
                                onClick={() => setInput(suggestion.desc)}
                            >
                                <div className="font-medium text-xs text-primary mb-1">{suggestion.title}</div>
                                <div className="text-xs text-muted-foreground">{suggestion.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {chatMessages.map((message, index) => {
              let contentToRender: React.ReactNode = null;

              if (typeof message.content === 'string') {
                  const isStringContent = true; // We know it's a string here
                  const containsCodeBlock = message.content.includes('```');
                  let contentParts: (string | { code: string, lang?: string })[] = [];

                  if ((message.role === 'assistant' || message.role === 'user') && containsCodeBlock) {
                      const parts = message.content.split(/(```(?:\w*\n)?(?:.|\n)*?```)/g);
                      contentParts = parts.map(part => {
                        const codeMatch = part.match(/^```(?:(\w*)\n)?((?:.|\n)*?)```$/);
                        if (codeMatch) {
                          return { code: codeMatch[2], lang: codeMatch[1] || 'plaintext' };
                        }
                        return part; 
                      }).filter(part => (typeof part === 'string' && part.trim() !== '') || typeof part === 'object');
                      
                      // Generate React nodes for parts
                      contentToRender = contentParts.map((part, partIndex) => {
                        if (typeof part === 'string') {
                           return (
                             <ReactMarkdown 
                               key={partIndex}
                               components={{
                                 p: ({node, ...props}) => <p className="whitespace-pre-wrap break-words" {...props} />,
                                 strong: ({node, ...props}) => <strong className="font-bold text-primary" {...props} />
                               }}
                             >
                               {part}
                             </ReactMarkdown>
                           );
                        } else {
                           // Use SyntaxHighlighter for code blocks
                           return (
                             <SyntaxHighlighter
                               key={partIndex}
                               language={part.lang?.toLowerCase() || 'plaintext'} 
                               style={vscDarkPlus} // Apply the chosen dark style
                               customStyle={{ 
                                  margin: '0.25rem 0', 
                                  padding: '0.75rem', 
                                  borderRadius: '0.375rem', // Equivalent to rounded-md
                                  backgroundColor: message.role === 'user' ? 'rgba(0, 0, 0, 0.3)' : '#1E1E1E', // Darker for user
                                  width: '100%', // Full width
                                  maxWidth: '100%' // Prevent overflow
                               }}
                               codeTagProps={{ style: { fontSize: '0.8rem' } }} // Adjust font size if needed
                               wrapLongLines={true}
                             >
                               {part.code.trim()} 
                             </SyntaxHighlighter>
                           );
                        }
                      });
                  } else {
                      // Render normal string content without code blocks
                      contentToRender = (
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="whitespace-pre-wrap break-words" {...props} />,
                            strong: ({node, ...props}) => <strong className={`font-bold ${message.role === 'user' ? 'text-white' : 'text-primary'}`} {...props} />
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      );
                  }
              } else {
                  // Handle non-string content (ModifyCodeIntent or other)
                  contentToRender = (
                      <p className="whitespace-pre-wrap text-red-400 italic">
                          [Unsupported Message Content]
                      </p>
                  );
              }

              return (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 group`}>
                  {/* Add avatar for assistant */}
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mr-2 mt-0.5 flex-shrink-0 border-2 border-border bg-gradient-to-br from-indigo-500 to-purple-700">
                      <AvatarFallback className="bg-transparent">
                        <Bot size={14} className="text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "p-3 text-sm shadow-lg",
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl rounded-tr-none max-w-[80%] md:max-w-[70%] border border-purple-500/20'
                      : 'bg-secondary text-foreground/90 rounded-2xl rounded-tl-none max-w-[80%] md:max-w-[70%] border border-border/50 backdrop-blur-sm',
                    "flex flex-col relative" // Ensure content inside flows vertically
                  )}>
                    {/* Small triangle for chat bubble */}
                    <div 
                      className={cn(
                        "absolute w-2 h-2 rotate-45 top-3",
                        message.role === 'user' 
                          ? 'right-[-4px] bg-purple-600'
                          : 'left-[-4px] bg-secondary'
                      )}
                    />
                    
                    {/* Timestamp - visible on hover */}
                    {message.timestamp && (
                      <span className="absolute -top-5 opacity-0 group-hover:opacity-90 transition-opacity text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                    
                    {/* Render the prepared content (text or code blocks) */}
                    <div className="px-1">
                      {contentToRender}
                    </div>
                    
                    {/* Render the diff if it exists - Updated Styling */}
                    {message.diff && message.role === 'assistant' && (
                      <pre 
                         className="mt-3 pt-2 border-t border-border/20 whitespace-pre text-xs font-mono overflow-x-auto scrollbar-thin rounded-md"
                         // Use explicit background from theme
                         style={{ backgroundColor: 'rgba(17, 17, 24, 0.6)' }} 
                       >
                        {message.diff.map((part, partIndex) => {
                          const lines = part.value.split('\n').filter((line, i, arr) => i < arr.length - 1 || line !== ''); 
                          return lines.map((line, lineIndex) => (
                            // Use inline styles for exact color matching
                            <div
                              key={`${partIndex}-${lineIndex}`}
                              className="flex min-h-[1.2em]"
                              style={{
                                // Use CSS variables for background with opacity
                                backgroundColor: part.added 
                                  ? 'rgba(106, 153, 85, 0.15)' // --color-comment at 15% opacity
                                  : part.removed 
                                  ? 'rgba(209, 105, 105, 0.15)' // --color-regexp at 15% opacity
                                  : undefined,
                              }}
                            >
                              <span 
                                className="w-5 px-1 text-center flex-shrink-0" 
                                style={{
                                  color: part.added 
                                    ? '#6a9955' // --color-comment
                                    : part.removed 
                                    ? '#d16969' // --color-regexp
                                    : 'rgba(226, 232, 240, 0.5)', // Dimmed foreground
                                }}
                              >
                                {part.added ? '+' : part.removed ? '-' : ' '} 
                              </span>
                              <span 
                                className="pl-1 pr-2 flex-grow break-words"
                                style={{
                                  color: part.added 
                                    ? '#6a9955' // --color-comment
                                    : part.removed 
                                    ? '#d16969' // --color-regexp
                                    : '#E2E8F0', // Default foreground
                                  textDecoration: part.removed ? 'line-through' : 'none',
                                }}
                              >
                                {line || '\u00A0'}
                              </span>
                            </div>
                          ));
                        })}
                      </pre>
                    )}
                  </div>
                  
                  {/* Add avatar for user */}
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 ml-2 mt-0.5 flex-shrink-0 border-2 border-border bg-gradient-to-br from-blue-500 to-violet-500">
                      <AvatarFallback className="bg-transparent text-xs text-white font-medium">
                        YOU
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-secondary/80 backdrop-blur-sm flex items-center gap-3 text-sm text-foreground shadow-md border border-border/50">
                  <div className="relative">
                    <Loader2 size={16} className="animate-spin" />
                    <div className="absolute inset-0 blur-sm animate-pulse opacity-80"></div>
                  </div>
                  <span className="font-medium">{aiStatus || 'Thinking...'}</span>
                </div>
              </div>
            )}

            {/* Display selected code snippet when waiting for instructions */}
            {isWaitingForFixInstructions && selectedCodeForChat && (
              <div className="w-full p-2 mb-1 border border-dashed border-primary/30 rounded-md bg-secondary/50 max-h-24 overflow-y-auto scrollbar-thin">
                 <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Code size={12}/>
                    Selected code (Provide instructions below):
                 </p>
                 <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all">
                    {selectedCodeForChat}
                 </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter 
        className="p-3 border-t border-white/10 bg-black/20 backdrop-blur-sm flex-col items-start gap-2"
      >
        <div className="relative w-full flex items-center gap-2">
          <div className="relative w-full group focus-within:ring-1 focus-within:ring-primary/50 focus-within:ring-offset-0 rounded-full overflow-hidden">
            <Textarea
              className="bg-secondary/80 flex-1 resize-none border border-border/20 focus-visible:ring-0 focus-visible:border-transparent text-sm min-h-[45px] max-h-[120px] scrollbar-thin rounded-full px-5 py-3 pr-12 text-foreground/90 placeholder:text-muted-foreground/60"
              placeholder={isWaitingForFixInstructions ? "Describe how to fix the selected code..." : "Enter your message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              style={{ fontFamily: sansSerifFontStack }}
            />
            <Button
              type="submit"
              variant="default"
              size="icon"
              className={cn(
                "absolute right-2 top-1/2 transform -translate-y-1/2 h-9 w-9 rounded-full transition-all",
                "bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white shadow-md",
                "disabled:bg-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed",
                "group-focus-within:scale-105"
              )}
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} className={isLoading ? "opacity-0" : "opacity-100"} />
              {isLoading && <Loader2 size={16} className="animate-spin absolute" />}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default AIChatPanel;
