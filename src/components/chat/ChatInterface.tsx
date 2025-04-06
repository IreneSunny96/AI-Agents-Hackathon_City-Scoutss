
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, User, Bot, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Add welcome message when component mounts
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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (!user) {
      toast.error('Please log in to use the chat feature');
      return;
    }

    // Add user message to chat
    const userMessage = {
      text: input,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Get the token from local storage
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
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { message: input, userId: user.id }
      });
      
      if (error) {
        throw new Error(`Error calling chat assistant: ${error.message}`);
      }
      
      // Add assistant response to chat
      setMessages((prev) => [
        ...prev,
        {
          text: data.reply,
          isUser: false,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get a response. Please try again.');
      
      // Add error message to chat
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
                  <div className="whitespace-pre-wrap">{message.text}</div>
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
