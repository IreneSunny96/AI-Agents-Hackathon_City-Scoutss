import React, { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Search, ArrowRight, UserCog, Loader2, Upload, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { processPlacesData, generatePersonalityInsights } from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
      
      // Parse the file directly without using storage
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
      
      // Process the data directly
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
      setGeneratingInsights(true);
      setProcessingStage('Generating personality insights...');
      setProcessingProgress(20);

      const result = await generatePersonalityInsights(user.id);
      
      if (result && result.success) {
        setProcessingProgress(100);
        setProcessingStage('Insights generated successfully!');
        
        setTimeout(() => {
          toast.success('Your personality profile has been created!');
          navigate('/profile');
        }, 1500);
      } else {
        throw new Error('Failed to generate personality insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error(error instanceof Error ? error.message : 'There was an error generating your insights. Please try again.');
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
    
    setShowUploadDialog(true);
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
                  
                  <Button 
                    className="bg-scout-500 hover:bg-scout-600 w-full"
                    size="lg"
                    onClick={handleGenerateInsights}
                    disabled={generatingInsights}
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
            
            <Button 
              onClick={handleSetupProfile}
              className="mt-4 bg-scout-500 hover:bg-scout-600"
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
          
          <div className="bg-gradient-to-br from-scout-500/10 to-scout-400/5 rounded-2xl p-8 border border-scout-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Where to next?</h2>
              <p className="text-muted-foreground">
                Let CityScout find your next adventure
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                className="bg-white dark:bg-gray-800 border border-input h-12 rounded-lg pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-scout-500 focus:border-transparent"
                placeholder="Search for places or activities..."
              />
            </div>
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
