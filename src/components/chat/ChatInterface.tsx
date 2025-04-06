
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, User, Bot, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  annotations?: Annotation[];
}

interface Annotation {
  text: string;
  type: string;
  start_index: number;
  end_index: number;
  url?: string;
  file_citation?: {
    file_id: string;
    quote: string;
  };
}

const formatMarkdown = (text: string | undefined) => {
  if (!text) return []; // Return empty array if text is undefined or null
  
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      if (inList) {
        result.push(
          <ul key={key++} className="list-disc pl-6 space-y-1 mb-2">
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      result.push(<br key={key++} />);
      continue;
    }

    if (trimmedLine.startsWith('# ')) {
      result.push(<h1 key={key++} className="text-lg font-bold mt-2 mb-1">{trimmedLine.slice(2)}</h1>);
    } else if (trimmedLine.startsWith('## ')) {
      result.push(<h2 key={key++} className="text-base font-semibold mt-2 mb-1">{trimmedLine.slice(3)}</h2>);
    } else if (trimmedLine.startsWith('### ')) {
      result.push(<h3 key={key++} className="text-sm font-semibold mt-1 mb-1">{trimmedLine.slice(4)}</h3>);
    } 
    else if (trimmedLine.match(/\*\*.*\*\*/)) {
      const content = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      result.push(<p key={key++} className="mb-1" dangerouslySetInnerHTML={{ __html: content }} />);
    }
    else if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(trimmedLine.slice(2));
    }
    else {
      if (inList) {
        result.push(
          <ul key={key++} className="list-disc pl-6 space-y-1 mb-2">
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      result.push(<p key={key++} className="mb-1">{trimmedLine}</p>);
    }
  }

  if (inList && listItems.length > 0) {
    result.push(
      <ul key={key++} className="list-disc pl-6 space-y-1 mb-2">
        {listItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  return result;
};

const renderTextWithAnnotations = (text: string, annotations?: Annotation[]) => {
  if (!annotations || annotations.length === 0) {
    return formatMarkdown(text);
  }

  const sortedAnnotations = [...annotations].sort((a, b) => b.start_index - a.start_index);
  
  let result = text;
  for (const annotation of sortedAnnotations) {
    if (annotation.type === 'link' && annotation.url) {
      const linkText = text.substring(annotation.start_index, annotation.end_index);
      const link = `[${linkText}](${annotation.url})`;
      result = result.substring(0, annotation.start_index) + link + result.substring(annotation.end_index);
    } else if (annotation.type === 'file_citation' && annotation.file_citation) {
      const citationText = text.substring(annotation.start_index, annotation.end_index);
      const citation = `[${citationText} (Source: ${annotation.file_citation.quote})]`;
      result = result.substring(0, annotation.start_index) + citation + result.substring(annotation.end_index);
    }
  }
  
  return formatMarkdown(result);
};

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          text: "Hi there! I'm your CityScout assistant. I can help you find places to visit, plan trips, or explore cities based on your interests. What would you like to know?",
          isUser: false,
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (!user) {
      toast.error('Please log in to use the chat feature');
      return;
    }

    const userMessage = {
      text: input,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('sb-zgdrcbdrmnhvfzygyecx-auth-token');
      let authToken = '';
      
      if (token) {
        try {
          const parsedToken = JSON.parse(token);
          authToken = parsedToken.access_token || '';
        } catch (e) {
          console.error('Error parsing auth token:', e);
        }
      }
      
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { message: input, userId: user.id }
      });
      
      if (error) {
        throw new Error(`Error calling chat assistant: ${error.message}`);
      }
      
      const responseMessage: Message = {
        text: data.reply || data.choices?.[0]?.message?.content || "I couldn't process your request properly.",
        isUser: false,
        timestamp: new Date(),
        annotations: data.choices?.[0]?.annotations || []
      };
      
      console.log('Response with annotations:', responseMessage);
      
      setMessages((prev) => [...prev, responseMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get a response. Please try again.');
      
      setMessages((prev) => [
        ...prev,
        {
          text: "I'm sorry, I couldn't process your request. Please try again later.",
          isUser: false,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[500px] w-full">
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">CityScout Assistant</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/profile')}
          className="flex items-center text-xs"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          View My Preferences
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col h-full p-4 pt-0">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <div 
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.isUser ? 'bg-scout-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {message.isUser ? (
                    <User className="h-5 w-5 text-white" />
                  ) : (
                    <Bot className="h-5 w-5 text-scout-500 dark:text-scout-400" />
                  )}
                </div>
                
                <div 
                  className={`p-3 rounded-lg ${
                    message.isUser 
                      ? 'bg-scout-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {message.isUser ? (
                    <div className="whitespace-pre-wrap">{message.text}</div>
                  ) : (
                    <div className={cn("prose prose-sm max-w-none", 
                      message.isUser ? "prose-invert" : "")}>
                      {message.annotations ? 
                        renderTextWithAnnotations(message.text, message.annotations) : 
                        formatMarkdown(message.text)}
                    </div>
                  )}
                  
                  {message.annotations && message.annotations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</p>
                      <ul className="space-y-1">
                        {message.annotations.filter(a => a.type === 'link' && a.url).map((annotation, i) => (
                          <li key={i} className="text-xs flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1 text-scout-500" />
                            <a 
                              href={annotation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-scout-500 hover:underline"
                            >
                              {annotation.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div 
                    className={`text-xs mt-1 ${
                      message.isUser ? 'text-scout-100' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-scout-500 dark:text-scout-400" />
                </div>
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="h-5 w-5 animate-spin text-scout-500" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about places to explore..."
            className="flex-1 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage}
            className="self-end bg-scout-500 hover:bg-scout-600"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;
