
import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Search, ArrowRight, UserCog, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { processPlacesData } from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const Index = () => {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const handleSetupProfile = () => {
    if (isProcessing) return;
    
    if (!user) {
      toast.error('You need to be logged in to set up your profile');
      navigate('/auth');
      return;
    }
    
    const processActivityFile = async () => {
      try {
        setIsProcessing(true);
        setProcessingStage('Preparing to analyze your activities...');
        setProcessingProgress(10);
        
        // Check if the staticactivity bucket exists
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError);
          toast.error('Failed to check storage buckets');
          setIsProcessing(false);
          navigate('/onboarding');
          return;
        }
        
        const bucketExists = buckets.some(bucket => bucket.name === 'staticactivity');
        console.log('Bucket exists:', bucketExists);
        
        if (!bucketExists) {
          console.error('The staticactivity bucket does not exist');
          toast.error('Storage bucket not found. Please contact support.');
          setIsProcessing(false);
          navigate('/onboarding');
          return;
        }
        
        // List files in the bucket to check if MyActivity.json exists
        const { data: files, error: listError } = await supabase.storage
          .from('staticactivity')
          .list();
        
        if (listError) {
          console.error('Error listing files in bucket:', listError);
          toast.error('Failed to check files in storage');
          setIsProcessing(false);
          navigate('/onboarding');
          return;
        }
        
        const fileExists = files.some(file => file.name === 'MyActivity.json');
        console.log('Files in bucket:', files.map(f => f.name));
        console.log('MyActivity.json exists:', fileExists);
        
        if (!fileExists) {
          console.error('MyActivity.json does not exist in the bucket');
          toast.error('Activity data file not found. Please upload it first.');
          setIsProcessing(false);
          navigate('/onboarding');
          return;
        }
        
        // Proceed with getting the public URL
        console.log('Attempting to download file from staticactivity bucket');
        
        const { data: publicUrlData } = await supabase.storage
          .from('staticactivity')
          .getPublicUrl('MyActivity.json');
        
        if (!publicUrlData || !publicUrlData.publicUrl) {
          console.error('Failed to get public URL');
          toast.error('Failed to access activity data URL');
          setIsProcessing(false);
          navigate('/onboarding');
          return;
        }
        
        console.log('Public URL retrieved:', publicUrlData.publicUrl);
        
        // Fetch the data from the public URL
        setProcessingStage('Downloading your activity data...');
        setProcessingProgress(30);
        
        try {
          const response = await fetch(publicUrlData.publicUrl);
          console.log('Fetch response status:', response.status);
          
          if (!response.ok) {
            console.error('Error fetching from public URL:', response.status, response.statusText);
            toast.error(`Failed to download activity data: ${response.statusText}`);
            setIsProcessing(false);
            navigate('/onboarding');
            return;
          }
          
          const jsonText = await response.text();
          console.log('Activity data downloaded, text length:', jsonText.length);
          
          // Try to parse the JSON to make sure it's valid
          let activityData;
          try {
            activityData = JSON.parse(jsonText);
            console.log('Successfully parsed JSON data');
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            toast.error('Failed to parse activity data');
            setIsProcessing(false);
            navigate('/onboarding');
            return;
          }
          
          // Process the data
          setProcessingStage('Analyzing your activities...');
          setProcessingProgress(50);
          
          console.log('Calling processPlacesData with user ID:', user.id);
          const result = await processPlacesData(user.id, activityData);
          console.log('Process result:', result);
          
          setProcessingStage('Finalizing your profile...');
          setProcessingProgress(80);
          
          if (result && result.success) {
            await supabase
              .from('profiles')
              .update({ onboarding_completed: true })
              .eq('id', user.id);
              
            setProcessingProgress(100);
            setProcessingStage('Analysis complete!');
            
            setTimeout(() => {
              toast.success('Your places data has been successfully analyzed!');
              setIsProcessing(false);
              navigate('/onboarding');
            }, 1500);
          } else {
            throw new Error('Failed to process places data');
          }
        } catch (fetchError) {
          console.error('Error fetching or processing activity data:', fetchError);
          toast.error('Error downloading or processing the activity data');
          setIsProcessing(false);
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Error processing activity data:', error);
        toast.error('There was an error processing your data. Please try again.');
        setIsProcessing(false);
        navigate('/onboarding');
      }
    };
    
    processActivityFile();
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onLogout={handleLogout} />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Analyzing Your Activities</h2>
              <p className="text-muted-foreground">{processingStage}</p>
            </div>
            
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
