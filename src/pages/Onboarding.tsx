
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import GDrivePicker from '@/components/GDrivePicker';
import { downloadFileFromDrive, saveFileReference } from '@/utils/driveUtils';
import { Loader2 } from 'lucide-react';

type UserFile = Tables<'user_files'>;

const Onboarding = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState(profile?.gender || '');
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; mimeType: string } | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);

  const handleFileSelected = (file: { id: string; name: string; mimeType: string }) => {
    setSelectedFile(file);
    toast.success(`Selected file: ${file.name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setLoading(true);

      // Update user profile
      await updateProfile({
        full_name: fullName,
        gender,
        onboarding_completed: true
      });

      // If a file was selected, download it from Google Drive and save to Supabase
      if (selectedFile && user) {
        setFileProcessing(true);
        
        // Get the current Google auth token
        const authInstance = window.gapi?.auth2?.getAuthInstance();
        if (!authInstance) {
          toast.error('Google authentication not initialized');
          setLoading(false);
          return;
        }
        
        const accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
        
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

            <div className="space-y-2">
              <Label>Google Drive Integration</Label>
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
