import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, Check } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import GoogleButton from '@/components/ui/GoogleButton';
import { Progress } from '@/components/ui/progress';
import { processUserOnboarding, processPlacesData, generatePersonalityInsights } from '@/services/apiService';

const Onboarding = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState(profile?.gender || '');
  const [isProfileSetupComplete, setIsProfileSetupComplete] = useState(false);
  const [backendProcessing, setBackendProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showPlacesDialog, setShowPlacesDialog] = useState(false);
  const [placesDataFile, setPlacesDataFile] = useState<File | null>(null);
  const [isProcessingPlaces, setIsProcessingPlaces] = useState(false);
  const [showPreferenceSelection, setShowPreferenceSelection] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState(false);

  useEffect(() => {
    if (user && profile && profile.onboarding_completed) {
      navigate('/');
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setLoading(true);

      if (age && (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120)) {
        toast.error('Please enter a valid age between 1 and 120');
        setLoading(false);
        return;
      }

      setIsProfileSetupComplete(true);
      
      setTimeout(async () => {
        try {
          await updateProfile({
            full_name: fullName,
            gender,
          });
          
          setBackendProcessing(true);
          
          try {
            if (user) {
              const result = await processUserOnboarding(user.id, {
                fullName,
                age: age ? Number(age) : null,
                gender
              });
              
              console.log('Backend processing result:', result);
              toast.success('Profile setup complete!');
            }
          } catch (backendError) {
            console.error('Error calling Python backend:', backendError);
            toast.error('There was an issue processing your data, but your profile has been set up.');
          } finally {
            setBackendProcessing(false);
          }
          
          setIsProfileSetupComplete(false);
          setShowPlacesDialog(true);
        } catch (error) {
          console.error('Error updating profile:', error);
          toast.error('Failed to update profile. Please try again.');
          setIsProfileSetupComplete(false);
        } finally {
          setLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setPlacesDataFile(files[0]);
    }
  };

  const processPlacesDataFile = async () => {
    if (!placesDataFile || !user) {
      toast.error('Please upload your Google activity data file first');
      return;
    }

    setIsProcessingPlaces(true);
    setProcessingStage('Reading activity data file...');
    setProcessingProgress(10);

    try {
      const fileContent = await placesDataFile.text();
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
        
        setProcessingProgress(100);
        setProcessingStage('Analysis complete!');
        setIsProcessingPlaces(false);
        setShowPlacesDialog(false);
        setInsightsGenerated(false);
      } else {
        throw new Error('Failed to process places data');
      }
    } catch (error) {
      console.error('Error processing activity file:', error);
      toast.error(error instanceof Error ? error.message : 'There was an error processing your data. Please try again.');
      setIsProcessingPlaces(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!user) {
      toast.error('You need to be logged in to generate insights');
      return;
    }

    try {
      setProcessingStage('Generating personality insights...');
      setProcessingProgress(20);

      const result = await generatePersonalityInsights(user.id);
      
      if (result && result.success) {
        setProcessingProgress(100);
        setProcessingStage('Insights generated successfully!');
        
        setTimeout(() => {
          toast.success('Your personality profile has been created!');
          setInsightsGenerated(true);
          navigate('/preferences');
        }, 1500);
      } else {
        throw new Error('Failed to generate personality insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      
      if (error instanceof Error && error.message.includes('OpenAI API key is missing')) {
        toast.error('Missing OpenAI API key. Please contact the administrator.');
      } else {
        toast.error(error instanceof Error ? error.message : 'There was an error generating your insights. Please try again.');
      }
    }
  };

  if (showPreferenceSelection && insightsGenerated) {
    navigate('/preferences');
    return null;
  }

  if (isProfileSetupComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome {fullName.split(' ')[0]}!</CardTitle>
            <CardDescription>
              {backendProcessing 
                ? 'Processing your data...' 
                : 'Please wait while we set up your profile'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-scout-500" />
              <p className="text-lg font-medium">
                {backendProcessing 
                  ? 'Connecting to backend services...' 
                  : 'Setting up your account...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isProcessingPlaces === false && processingProgress === 100 && !insightsGenerated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="text-center mb-6">
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
                >
                  Let's get your preferences!
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Let's get started</CardTitle>
          <CardDescription>
            {fullName ? `Welcome ${fullName.split(' ')[0]}!` : 'Set up your profile'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Your age"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select 
                value={gender} 
                onValueChange={setGender}
                disabled={loading}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Google Authentication</Label>
              
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-3">
                  Authenticate with Google to use CityScout data.
                </p>
                
                <GoogleButton 
                  onClick={() => {
                    toast.info('Google authentication will be implemented later');
                  }} 
                  loading={false}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : 'Set up your profile'}
            </Button>
            
            <Dialog open={showPlacesDialog} onOpenChange={setShowPlacesDialog}>
              <DialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => setShowPlacesDialog(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Process Places Data
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Process Your Places Data</DialogTitle>
                  <DialogDescription>
                    Upload your Google Activity JSON file to analyze your place preferences
                  </DialogDescription>
                </DialogHeader>
                
                {isProcessingPlaces ? (
                  <div className="space-y-4 py-4">
                    <p className="text-center">{processingStage}</p>
                    <Progress value={processingProgress} className="w-full h-2" />
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="places-file">Google Activity JSON File</Label>
                      <Input 
                        id="places-file" 
                        type="file" 
                        accept=".json" 
                        onChange={handleFileChange}
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload your MyActivity.json file from Google Takeout
                      </p>
                    </div>
                    
                    <Button 
                      onClick={processPlacesDataFile}
                      className="w-full"
                      disabled={!placesDataFile}
                    >
                      Process Data
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
