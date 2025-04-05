
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, User } from 'lucide-react';
import GoogleButton from '@/components/ui/GoogleButton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ConnectProps {
  onComplete?: () => void;
}

const Connect: React.FC<ConnectProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleConnectGoogle = () => {
    setLoading(true);
    
    // Mock Google authentication flow
    setTimeout(() => {
      setLoading(false);
      toast.success("Successfully connected to Google!");
      
      if (onComplete) {
        onComplete();
      }
    }, 1500);
  };

  const mockSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 map-grid-bg">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-scout-500">City Scout</h1>
          <p className="text-lg font-medium text-scout-400">Your AI City Companion</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Discover personalized recommendations for places, events, and activities tailored to your preferences and schedule.
          </p>
        </div>
        
        <Card className="border-scout-200 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-scout-100 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-scout-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connect to Google</CardTitle>
            <CardDescription>
              Enhance your CityScout experience by connecting your Google account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center mb-3">
              <p className="text-sm font-medium">
                Connect to your Google account
              </p>
              <p className="text-xs text-muted-foreground">
                City Scout uses your Google data to provide personalized recommendations
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-scout-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-scout-500" />
                </div>
                <div>
                  <h3 className="font-medium">Google Maps Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    To understand places you've visited and your preferences
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-scout-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-scout-500" />
                </div>
                <div>
                  <h3 className="font-medium">Google Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    To find free time slots and schedule activities
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-scout-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-scout-500" />
                </div>
                <div>
                  <h3 className="font-medium">Google Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    For basic account information
                  </p>
                </div>
              </div>
            </div>
            
            <GoogleButton onClick={handleConnectGoogle} loading={loading} />
          </CardContent>
          
          <CardFooter className="flex justify-center border-t pt-4">
            <Button 
              variant="link" 
              className="text-muted-foreground text-sm"
              onClick={mockSkip}
            >
              I'll do this later
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Connect;
