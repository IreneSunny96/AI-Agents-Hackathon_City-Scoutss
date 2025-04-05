
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Onboarding = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState(profile?.gender || '');
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; id: string } | null>(null);

  // Mock function for Google Drive picker - in a real app, integrate with Google Drive API
  const openDrivePicker = () => {
    setDrivePickerOpen(true);
    // In a real implementation, you would use the Google Picker API to select files
  };

  // Mock function for selecting a file from the dialog
  const mockSelectFile = (name: string, id: string) => {
    setSelectedFile({ name, id });
    setDrivePickerOpen(false);
    toast.success(`Selected file: ${name}`);
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

      // If a file was selected, save reference to database
      if (selectedFile && user) {
        const { error } = await supabase
          .from('user_files')
          .insert({
            user_id: user.id,
            file_name: selectedFile.name,
            original_drive_id: selectedFile.id,
            metadata: { source: 'google_drive' }
          });

        if (error) {
          console.error('Error saving file reference:', error);
          toast.error('Failed to save file reference');
          return;
        }
      }

      toast.success('Profile updated successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
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
                  Connect to Google Drive to select a JSON file for your profile.
                </p>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={openDrivePicker}
                  className="w-full"
                  disabled={loading}
                >
                  {selectedFile ? 'Change Selected File' : 'Select File from Drive'}
                </Button>
                {selectedFile && (
                  <div className="mt-2 p-2 bg-primary/10 rounded text-sm">
                    Selected: <span className="font-medium">{selectedFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mock Google Drive Picker Dialog */}
      <Dialog open={drivePickerOpen} onOpenChange={setDrivePickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a file from Google Drive</DialogTitle>
            <DialogDescription>
              Choose a JSON file from your Google Drive to use with CityScout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div 
              onClick={() => mockSelectFile('preferences.json', 'mock-id-1')} 
              className="p-3 border rounded-md cursor-pointer hover:bg-muted flex justify-between items-center"
            >
              <div>
                <p className="font-medium">preferences.json</p>
                <p className="text-xs text-muted-foreground">JSON File • 24KB</p>
              </div>
              <Button size="sm" variant="ghost">Select</Button>
            </div>
            <div 
              onClick={() => mockSelectFile('citydata.json', 'mock-id-2')} 
              className="p-3 border rounded-md cursor-pointer hover:bg-muted flex justify-between items-center"
            >
              <div>
                <p className="font-medium">citydata.json</p>
                <p className="text-xs text-muted-foreground">JSON File • 128KB</p>
              </div>
              <Button size="sm" variant="ghost">Select</Button>
            </div>
            <div 
              onClick={() => mockSelectFile('travel_history.json', 'mock-id-3')} 
              className="p-3 border rounded-md cursor-pointer hover:bg-muted flex justify-between items-center"
            >
              <div>
                <p className="font-medium">travel_history.json</p>
                <p className="text-xs text-muted-foreground">JSON File • 56KB</p>
              </div>
              <Button size="sm" variant="ghost">Select</Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDrivePickerOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Onboarding;
