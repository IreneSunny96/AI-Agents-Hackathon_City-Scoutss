import React, { useState, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Search, ArrowRight, UserCog, Loader2, Upload, Check, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { processPlacesData, generatePersonalityInsights } from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from '@/components/ui/card';
import { User, Bot, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatMarkdown = (text: string) => {
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

const Index = () => {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activityFile, setActivityFile] = useState<File | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [isDataDeletionInProgress, setIsDataDeletionInProgress] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [openAiKeyError, setOpenAiKeyError] = useState(false);
  
  const [searchInput, setSearchInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean, timestamp: Date}>>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (user) {
      checkExistingAnalysis();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkExistingAnalysis = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('has_personality_insights')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking analysis status:', error);
        return;
      }
      
      setHasExistingAnalysis(data?.has_personality_insights || false);
    } catch (error) {
      console.error('Error checking existing analysis:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setActivityFile(files[0]);
    }
  };

  const deleteUserData = async () => {
    if (!user) return;
    
    try {
      setIsDataDeletionInProgress(true);
      
      const folderPath = `user_data/${user.id}`;
      
      const { data: files, error: listError } = await supabase
        .storage
        .from('user_files')
        .list(folderPath);
      
      if (listError) {
        console.error('Error listing files:', listError);
      } else if (files && files.length > 0) {
        for (const file of files) {
          const { error: deleteError } = await supabase
            .storage
            .from('user_files')
            .remove([`${folderPath}/${file.name}`]);
          
          if (deleteError) {
            console.error(`Error deleting file ${file.name}:`, deleteError);
          }
        }
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          has_personality_insights: false,
          personality_tiles: null
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setHasExistingAnalysis(false);
      setAnalysisComplete(false);
      setShowDeleteConfirmDialog(false);
      
      toast.success('Your data has been deleted successfully');
      
      setShowUploadDialog(true);
    } catch (error) {
      console.error('Error deleting user data:', error);
      toast.error('Failed to delete your data. Please try again.');
    } finally {
      setIsDataDeletionInProgress(false);
    }
  };

  const uploadAndProcessFile = async () => {
    if (!activityFile || !user) {
      toast.error('Please select a file first');
      return;
    }

    try {
      setIsProcessing(true);
      setAnalysisComplete(false);
      setProcessingStage('Reading your activity data file...');
      setProcessingProgress(10);
      
      const fileContent = await activityFile.text();
      let activityData;
      
      try {
        setProcessingStage('Parsing your activity data...');
        setProcessingProgress(30);
        
        activityData = JSON.parse(fileContent);
        console.log('Successfully parsed JSON data, length:', activityData.length);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Failed to parse activity data. Is it a valid JSON file?');
      }
      
      setProcessingStage('Analyzing your activities...');
      setProcessingProgress(60);
      
      console.log('Calling processPlacesData with user ID:', user.id);
      const result = await processPlacesData(user.id, activityData);
      console.log('Process result:', result);
      
      if (result && result.success) {
        setProcessingStage('Finalizing your profile...');
        setProcessingProgress(90);
        
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
          
        setProcessingProgress(100);
        setProcessingStage('Analysis complete!');
        setAnalysisComplete(true);
      } else {
        throw new Error('Failed to process places data');
      }
    } catch (error) {
      console.error('Error processing activity file:', error);
      toast.error(error instanceof Error ? error.message : 'There was an error processing your data. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!user) {
      toast.error('You need to be logged in to generate insights');
      return;
    }

    try {
      setOpenAiKeyError(false);
      setGeneratingInsights(true);
      setProcessingStage('Generating personality insights...');
      setProcessingProgress(20);

      const result = await generatePersonalityInsights(user.id);
      
      if (result && result.success) {
        setProcessingProgress(100);
        setProcessingStage('Insights generated successfully!');
        
        setTimeout(() => {
          toast.success('Your personality profile has been created!');
          navigate('/preferences');
        }, 1500);
      } else {
        throw new Error('Failed to generate personality insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      
      if (error instanceof Error && error.message.includes('OpenAI API key is missing')) {
        setOpenAiKeyError(true);
        toast.error('Missing OpenAI API key. Please contact the administrator.');
      } else {
        toast.error(error instanceof Error ? error.message : 'There was an error generating your insights. Please try again.');
      }
      
      setGeneratingInsights(false);
    }
  };

  const handleSetupProfile = () => {
    if (isProcessing) return;
    
    if (!user) {
      toast.error('You need to be logged in to set up your profile');
      navigate('/auth');
      return;
    }
    
    if (hasExistingAnalysis) {
      navigate('/profile');
      return;
    }
    
    setShowUploadDialog(true);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchInput.trim() || !user) return;
    
    const userMessage = {
      text: searchInput,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoadingResponse(true);
    setIsChatting(true);
    setSearchInput('');
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { message: userMessage.text, userId: user.id }
      });
      
      if (error) {
        throw new Error(`Error calling chat assistant: ${error.message}`);
      }
      
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: data.reply,
          isUser: false,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get a response. Please try again.');
      
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: "I'm sorry, I couldn't process your request. Please try again later.",
          isUser: false,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onLogout={handleLogout} />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="text-center mb-6">
              {analysisComplete ? (
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Analysis Complete!</h2>
                  <p className="text-muted-foreground mb-6">Your activity data has been successfully analyzed.</p>
                  
                  {openAiKeyError ? (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                      <h3 className="text-red-700 font-medium mb-2">Configuration Error</h3>
                      <p className="text-sm text-red-600 mb-2">
                        The OpenAI API key is missing in the Supabase Edge Function configuration.
                      </p>
                      <p className="text-sm text-red-600">
                        Please contact the administrator to set up the OPENAI_API_KEY in the Supabase Edge Function Secrets.
                      </p>
                    </div>
                  ) : null}
                  
                  <Button 
                    className="bg-scout-500 hover:bg-scout-600 w-full"
                    size="lg"
                    onClick={handleGenerateInsights}
                    disabled={generatingInsights || openAiKeyError}
                  >
                    {generatingInsights ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating insights...
                      </>
                    ) : (
                      <>
                        Let's get your preferences!
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2">Analyzing Your Activities</h2>
                  <p className="text-muted-foreground">{processingStage}</p>
                </>
              )}
            </div>
            
            {!analysisComplete && (
              <div className="space-y-6">
                <Progress value={processingProgress} className="w-full h-2" />
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-scout-100 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-scout-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-scout-100 flex items-center justify-center">
                      <Search className="h-6 w-6 text-scout-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-scout-100 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-scout-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {analysisComplete && generatingInsights && (
              <div className="mt-6">
                <Progress value={processingProgress} className="w-full h-2" />
                <p className="text-sm text-center mt-4 text-muted-foreground">{processingStage}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">
              Welcome {profile?.full_name ? `${profile.full_name.split(' ')[0]}` : ''} to CityScout
            </h1>
            <p className="text-lg text-muted-foreground">
              Your AI companion for exploring the city based on your interests
            </p>
            
            <div className="mt-4 flex justify-center">
              {hasExistingAnalysis ? (
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                  <Button 
                    onClick={handleSetupProfile}
                    className="bg-scout-500 hover:bg-scout-600"
                    size="lg"
                  >
                    <UserCog className="mr-2 h-5 w-5" />
                    View Your Preferences
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/about-me')}
                    variant="outline" 
                    size="lg"
                  >
                    About Me
                  </Button>
                  
                  <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="lg">
                        <Trash2 className="mr-2 h-5 w-5" />
                        Reset & Upload New Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete existing data?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your analyzed data and personality insights. You'll need to upload and analyze a new file.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={deleteUserData} 
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={isDataDeletionInProgress}
                        >
                          {isDataDeletionInProgress ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete & Start Over"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <Button 
                  onClick={handleSetupProfile}
                  className="bg-scout-500 hover:bg-scout-600"
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserCog className="mr-2 h-5 w-5" />
                      Setup Profile
                    </>
                  )}
                </Button>
              )}
            </div>

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Your Activity Data</DialogTitle>
                  <DialogDescription>
                    Upload your Google Maps activity data to analyze your preferences
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Please upload your MyActivity.json file from Google Takeout
                    </p>
                    <Input 
                      ref={fileInputRef} 
                      type="file" 
                      accept=".json" 
                      onChange={handleFileChange}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <Button 
                    onClick={uploadAndProcessFile}
                    className="w-full bg-scout-500 hover:bg-scout-600"
                    disabled={!activityFile || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload and Analyze
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {hasExistingAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 shadow-sm">
                <div className="mb-4">
                  <div className="h-12 w-12 rounded-full bg-scout-100 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-scout-500" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Discover Places</h2>
                <p className="text-muted-foreground mb-4">
                  Find new spots to visit based on your interests and previous activities
                </p>
                <Button className="w-full" variant="outline">
                  <span>Explore</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 shadow-sm">
                <div className="mb-4">
                  <div className="h-12 w-12 rounded-full bg-scout-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-scout-500" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Plan Your Day</h2>
                <p className="text-muted-foreground mb-4">
                  Get personalized itineraries that fit your schedule and preferences
                </p>
                <Button className="w-full" variant="outline">
                  <span>Plan Now</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="bg-gradient-to-br from-scout-500/10 to-scout-400/5 rounded-2xl p-8 border border-scout-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Where to next?</h2>
              <p className="text-muted-foreground">
                Let CityScout find your next adventure
              </p>
            </div>
            
            <form onSubmit={handleSearchSubmit} className="w-full mb-6">
              <div className="relative flex">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  className="bg-white dark:bg-gray-800 border border-input h-12 rounded-lg pl-10 pr-16 w-full focus:outline-none focus:ring-2 focus:ring-scout-500 focus:border-transparent"
                  placeholder="Search for places or activities..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="absolute right-2 top-2 p-2 rounded-md text-scout-500 hover:bg-scout-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={!searchInput.trim() || isLoadingResponse}
                >
                  {isLoadingResponse ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
            
            {isChatting && hasExistingAnalysis && (
              <div className="max-h-[400px] overflow-y-auto p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
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
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border dark:border-gray-700'
                        }`}
                      >
                        {message.isUser ? (
                          <div className="whitespace-pre-wrap">{message.text}</div>
                        ) : (
                          <div className={cn("prose prose-sm max-w-none", 
                               message.isUser ? "prose-invert" : "")}>
                            {formatMarkdown(message.text)}
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
                {isLoadingResponse && (
                  <div className="flex justify-start mb-4">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-scout-500 dark:text-scout-400" />
                      </div>
                      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border dark:border-gray-700">
                        <Loader2 className="h-5 w-5 animate-spin text-scout-500" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 CityScout - Your AI Companion for City Exploration</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
