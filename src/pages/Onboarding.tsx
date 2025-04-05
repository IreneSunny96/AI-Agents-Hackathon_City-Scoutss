
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import GDrivePicker from '@/components/GDrivePicker';
import { downloadFileFromDrive, saveFileReference } from '@/utils/driveUtils';
import { Loader2 } from 'lucide-react';
import FileUploader from '@/components/ui/FileUploader';

const Onboarding = () => {
  const { user, profile, updateProfile, getGoogleAuthToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState(profile?.gender || '');
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; mimeType: string } | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [googleTokenAvailable, setGoogleTokenAvailable] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  
  // Check if we have a valid Google token
  useEffect(() => {
    const checkGoogleToken = async () => {
      if (user) {
        const token = await getGoogleAuthToken();
        setGoogleTokenAvailable(!!token);
        
        if (!token) {
          console.log("No Google token available. File selection from Google Drive may not work.");
        }
      }
    };
    
    checkGoogleToken();
  }, [user, getGoogleAuthToken]);

  const handleFileSelected = (file: { id: string; name: string; mimeType: string }) => {
    setSelectedFile(file);
    toast.success(`Selected file: ${file.name}`);
  };

  const handleFileUploaded = (filePath: string) => {
    setUploadedFilePath(filePath);
    toast.success('File uploaded successfully!');
  };

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

      // Update user profile
      await updateProfile({
        full_name: fullName,
        gender,
        onboarding_completed: true,
        // We would need to update the profiles table schema to include age
        // For now, we can store it in metadata
      });

      // If a file was selected from Google Drive, download it and save to Supabase
      if (selectedFile && user && googleTokenAvailable) {
        setFileProcessing(true);
        
        // Get the current Google auth token from session
        const accessToken = await getGoogleAuthToken();
        
        if (!accessToken) {
          toast.error('Google authentication token not available. Please try signing in again.');
          setLoading(false);
          setFileProcessing(false);
          return;
        }
        
        // Download the file from Google Drive and upload to Supabase Storage
        const storagePath = await downloadFileFromDrive(
          selectedFile.id,
          selectedFile.name,
          user.id,
          accessToken
        );
        
        // Save file reference to database
        if (storagePath) {
          await saveFileReference(
            user.id,
            selectedFile.name,
            selectedFile.id,
            storagePath.path
          );
          toast.success('File saved successfully!');
        } else {
          toast.error('Failed to save file. Please try again.');
        }
      }

      toast.success('Profile updated successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
      setFileProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Let's get started</CardTitle>
          <CardDescription>
            Let's set up your profile {fullName ? fullName.split(' ')[0] : 'there'}!
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
              <Label>File Upload</Label>
              
              {googleTokenAvailable ? (
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm text-muted-foreground mb-3">
                    Select a JSON file from your Google Drive to use with CityScout.
                  </p>
                  
                  <GDrivePicker 
                    onFileSelected={handleFileSelected}
                    accept={['application/json']}
                    buttonText={selectedFile ? 'Change Selected File' : 'Select File from Drive'}
                  />
                  
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-primary/10 rounded text-sm">
                      Selected: <span className="font-medium">{selectedFile.name}</span>
                    </div>
                  )}
                  
                  {fileProcessing && (
                    <div className="mt-2 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Processing file...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload a JSON file to use with CityScout.
                  </p>
                  
                  {user && (
                    <FileUploader 
                      userId={user.id} 
                      onFileUploaded={handleFileUploaded}
                      accept=".json"
                      disabled={loading}
                    />
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
