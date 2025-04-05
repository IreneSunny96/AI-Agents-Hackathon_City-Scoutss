
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, FileUpload } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import GoogleButton from '@/components/ui/GoogleButton';
import { Progress } from '@/components/ui/progress';
import { processUserOnboarding, processPlacesData } from '@/services/apiService';

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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setLoading(true);

      // Validate age if it's entered
      if (age && (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120)) {
        toast.error('Please enter a valid age between 1 and 120');
        setLoading(false);
        return;
      }

      // Show the profile setup screen
      setIsProfileSetupComplete(true);
      
      // Update user profile after a short delay to show the loading state
      setTimeout(async () => {
        try {
          // Update user profile
          await updateProfile({
            full_name: fullName,
            gender,
            onboarding_completed: true,
          });
          
          // Now try to call the Python backend to process the static JSON files
          setBackendProcessing(true);
          
          try {
            if (user) {
              // Call your Python FastAPI backend
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
            // We'll still continue with the onboarding even if the backend fails
            toast.error('There was an issue processing your data, but your profile has been set up.');
          } finally {
            setBackendProcessing(false);
          }
          
          navigate('/');
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
      // Read the file contents
      const fileContent = await placesDataFile.text();
      const activityData = JSON.parse(fileContent);

      setProcessingStage('Processing your places data...');
      setProcessingProgress(30);

      // Process the data using the Edge Function
      const result = await processPlacesData(user.id, activityData);
      
      setProcessingStage('Analyzing places preferences...');
      setProcessingProgress(70);

      // Simulate additional processing time
      setTimeout(() => {
        setProcessingProgress(100);
        setProcessingStage('Analysis complete!');
        
        setTimeout(() => {
          setIsProcessingPlaces(false);
          toast.success('Your places data has been successfully analyzed!');
          setShowPlacesDialog(false);
        }, 1000);
      }, 2000);

    } catch (error) {
      console.error('Error processing places data:', error);
      toast.error('Failed to process your places data. Please try again.');
      setIsProcessingPlaces(false);
    }
  };

  // If we're in the profile setup complete state, show the loading screen
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
                    // This button does nothing for now
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
                  <FileUpload className="mr-2 h-4 w-4" />
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
                    <Progress value={processingProgress} className="w-full" />
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
