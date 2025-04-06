
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, RefreshCcw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DeleteAccountDialog } from '@/components/ui/delete-account-dialog';
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
import { cn } from '@/lib/utils';

// Helper function to convert markdown to HTML
const formatMarkdown = (text: string) => {
  // Split the text into lines
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let key = 0;

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (trimmedLine === '') {
      if (inList) {
        // End the current list
        result.push(
          <ul key={key++} className="list-disc pl-6 space-y-1 mb-4">
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      continue;
    }

    // Headers
    if (trimmedLine.startsWith('# ')) {
      result.push(<h1 key={key++} className="text-3xl font-bold mt-6 mb-4">{trimmedLine.slice(2)}</h1>);
    } else if (trimmedLine.startsWith('## ')) {
      result.push(<h2 key={key++} className="text-2xl font-semibold mt-5 mb-3">{trimmedLine.slice(3)}</h2>);
    } else if (trimmedLine.startsWith('### ')) {
      result.push(<h3 key={key++} className="text-xl font-semibold mt-4 mb-2">{trimmedLine.slice(4)}</h3>);
    } else if (trimmedLine.startsWith('#### ')) {
      result.push(<h4 key={key++} className="text-lg font-medium mt-3 mb-2">{trimmedLine.slice(5)}</h4>);
    }
    // Bold
    else if (trimmedLine.match(/\*\*.*\*\*/)) {
      const content = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      result.push(<p key={key++} className="mb-4" dangerouslySetInnerHTML={{ __html: content }} />);
    }
    // Emoji headers - custom format
    else if (trimmedLine.match(/^[🍜🧘‍♂️🎭✈️🏙️🔎]/) || trimmedLine.includes(':')) {
      result.push(<h2 key={key++} className="text-xl font-semibold mt-6 mb-3">{trimmedLine}</h2>);
    }
    // List items
    else if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(trimmedLine.slice(2));
    }
    // Normal paragraph
    else {
      if (inList) {
        // End the current list before starting a paragraph
        result.push(
          <ul key={key++} className="list-disc pl-6 space-y-1 mb-4">
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      result.push(<p key={key++} className="mb-4">{trimmedLine}</p>);
    }
  }

  // Handle any remaining list items
  if (inList && listItems.length > 0) {
    result.push(
      <ul key={key++} className="list-disc pl-6 space-y-1 mb-4">
        {listItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }

  return result;
};

const AboutMe = () => {
  const { user, signOut, deleteAccount, resetUserData } = useAuth();
  const navigate = useNavigate();
  const [personalityReport, setPersonalityReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [hasPreferenceChosen, setHasPreferenceChosen] = useState(false);
  const [hasPersonalityInsights, setHasPersonalityInsights] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [bucketExists, setBucketExists] = useState(false);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const fetchPersonalityReport = async () => {
      try {
        setLoading(true);
        
        // Check if storage bucket exists
        const { data: buckets, error: bucketsError } = await supabase
          .storage
          .listBuckets();
          
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError);
          setDebugInfo(prev => `${prev || ''}\nError listing buckets: ${bucketsError.message}`);
        } else {
          const userFilesBucket = buckets.find(b => b.name === 'user_files');
          setBucketExists(!!userFilesBucket);
          
          if (!userFilesBucket) {
            console.error('user_files bucket does not exist');
            setDebugInfo(prev => `${prev || ''}\nuser_files bucket does not exist, available buckets: ${buckets.map(b => b.name).join(', ')}`);
          }
        }
        
        // Fetch profile data to check preferences status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }
        
        setHasPreferenceChosen(!!profile.preference_chosen);
        setHasPersonalityInsights(!!profile.has_personality_insights);
        
        let reportText = null;
        
        // First try to get personality report from the database
        try {
          const { data: reportData, error: reportError } = await supabase
            .from('user_data')
            .select('content')
            .eq('user_id', user.id)
            .eq('data_type', 'personality_report')
            .single();
            
          if (!reportError && reportData?.content) {
            reportText = reportData.content;
            console.log("Successfully retrieved personality report from database");
            setDebugInfo(prev => `${prev || ''}\nSuccessfully retrieved personality report from database`);
          } else {
            console.log("Could not fetch personality report from database:", reportError?.message);
            setDebugInfo(prev => `${prev || ''}\nCould not fetch personality report from database: ${reportError?.message || 'Unknown error'}`);
            
            // If database retrieval fails and bucket exists, try storage
            if (bucketExists) {
              const userFolder = `user_data/${user.id}`;
              const filePath = `${userFolder}/personality_report.txt`;
              
              console.log('Attempting to download report from path:', filePath);
              setDebugInfo(prev => `${prev || ''}\nAttempting to download report from storage path: ${filePath}`);
              
              const { data, error } = await supabase.storage
                .from('user_files')
                .download(filePath);
              
              if (error) {
                console.error('Error downloading personality report from storage:', error);
                setDebugInfo(prev => `${prev || ''}\nError downloading personality report from storage: ${error.message}`);
                
                const { data: folderData, error: folderError } = await supabase.storage
                  .from('user_files')
                  .list(userFolder);
                  
                if (folderError) {
                  console.error('Error listing folder:', folderError);
                  setDebugInfo(prev => `${prev}\nFolder error: ${folderError.message}`);
                } else {
                  console.log('Files in folder:', folderData);
                  const fileList = folderData?.map(f => f.name).join(', ') || 'none';
                  setDebugInfo(prev => `${prev}\nFiles in folder: ${fileList}`);
                  
                  const { data: rootData } = await supabase.storage
                    .from('user_files')
                    .list('');
                    
                  if (rootData && rootData.length > 0) {
                    setDebugInfo(prev => `${prev}\nRoot directory files: ${rootData.map(f => f.name).join(', ')}`);
                  }
                }
              } else {
                reportText = await data.text();
                console.log('Personality report loaded successfully from storage');
                setDebugInfo(prev => `${prev || ''}\nPersonality report loaded successfully from storage`);
              }
            }
          }
        } catch (error) {
          console.error('Error in data retrieval process:', error);
          setDebugInfo(prev => `${prev || ''}\nError in data retrieval process: ${error}`);
        }
        
        if (reportText) {
          setPersonalityReport(reportText);
        } else if (profile.preference_chosen && profile.has_personality_insights) {
          toast.error('Failed to load your personality report from any source');
        }
      } catch (error) {
        console.error('Error fetching personality report:', error);
        toast.error('An error occurred while loading your personality report');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersonalityReport();
  }, [user, navigate, bucketExists]);
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };
  
  const formatReportContent = (text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, index) => {
      if (paragraph.match(/^[🍜🧘‍♂️🎭✈️🏙️🔎]/) || paragraph.includes(':')) {
        return <h2 key={index} className="text-xl font-semibold mt-6 mb-3">{paragraph}</h2>;
      }
      
      if (paragraph.includes('- ')) {
        const lines = paragraph.split('\n');
        const listItems = lines.filter(line => line.trim().startsWith('- '));
        const nonListText = lines.filter(line => !line.trim().startsWith('- ')).join('\n');
        
        return (
          <div key={index} className="mb-4">
            {nonListText && <p className="mb-2">{nonListText}</p>}
            <ul className="list-disc pl-6 space-y-1">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex}>{item.replace('- ', '')}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      return <p key={index} className="mb-4">{paragraph}</p>;
    });
  };
  
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success('Your account has been deleted successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete your account. Please try again.');
    }
  };
  
  const handleReset = async () => {
    try {
      setResetting(true);
      await resetUserData();
      toast.success('Your profile has been reset successfully');
      navigate('/');
    } catch (error) {
      console.error('Error resetting profile:', error);
      toast.error('Failed to reset your profile. Please try again.');
    } finally {
      setResetting(false);
    }
  };
  
  const handleManualUpload = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-personality-insights', {
        body: { userId: user.id }
      });
      
      if (error) {
        console.error('Error generating personality insights:', error);
        toast.error('Failed to generate personality report');
        return;
      }
      
      toast.success('Personality report generated successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error calling generate-personality-insights:', error);
      toast.error('An error occurred while generating your personality report');
    } finally {
      setLoading(false);
    }
  };
  
  const createBucket = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-storage-bucket', {
        body: { name: 'user_files' }
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        toast.error('Failed to create storage bucket');
        return;
      }
      
      toast.success('Storage bucket created successfully');
      setBucketExists(true);
    } catch (error) {
      console.error('Error calling create-storage-bucket:', error);
      toast.error('An error occurred while creating the storage bucket');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onLogout={handleLogout} />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-scout-500 animate-spin mb-4" />
            <p className="text-lg font-medium">Loading your profile...</p>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">
              About Me
            </h1>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <p className="text-lg text-muted-foreground">
              A detailed analysis of your preferences and personality based on your activity data
            </p>
            <Button 
              onClick={() => navigate('/profile')}
              className="bg-scout-500 hover:bg-scout-600"
            >
              View Preferences
            </Button>
          </div>
          
          {!personalityReport ? (
            <Card className="mb-8 bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <h2 className="text-xl font-semibold mb-2">No Personality Report Available</h2>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {!hasPreferenceChosen ? 
                    "You haven't confirmed your preferences yet. Go to the preferences page to complete your profile." : 
                    "You haven't generated a personality report yet. Go to the home page and upload your activity data to get started."}
                </p>
                <div className="flex flex-col space-y-4 w-full max-w-xs">
                  <Button 
                    onClick={() => navigate('/preferences')}
                    className="bg-scout-500 hover:bg-scout-600 w-full"
                  >
                    Complete Preferences
                  </Button>
                  {hasPreferenceChosen && (
                    <Button 
                      onClick={handleManualUpload}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Personality Report Manually
                    </Button>
                  )}
                  
                  {!bucketExists && (
                    <Button 
                      onClick={createBucket}
                      variant="secondary"
                      className="w-full"
                    >
                      Create Storage Bucket
                    </Button>
                  )}
                </div>
                
                {debugInfo && (
                  <div className="mt-8 w-full">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Debug Information</summary>
                      <pre className="p-4 bg-muted rounded mt-2 overflow-x-auto">
                        {debugInfo}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Personality Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn("prose prose-sm max-w-none dark:prose-invert")}>
                  {formatMarkdown(personalityReport)}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex flex-col items-center space-y-4 mb-8">
            <Button 
              onClick={() => navigate('/')}
              className="bg-scout-500 hover:bg-scout-600"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
            
            <div className="flex space-x-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset Profile
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset your profile?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all your preferences and personality insights. You'll need to go through the onboarding process again. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReset}
                      className="bg-red-500 hover:bg-red-600 text-white"
                      disabled={resetting}
                    >
                      {resetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Reset Profile'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <DeleteAccountDialog onConfirm={handleDeleteAccount} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutMe;
