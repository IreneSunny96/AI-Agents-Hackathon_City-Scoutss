
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, User } from 'lucide-react';
import GoogleButton from '@/components/ui/GoogleButton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ConnectProps {
  onComplete?: () => void;
}

const Connect: React.FC<ConnectProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleConnectGoogle = async () => {
    setLoading(true);
    
    try {
      // Reset any previous user data for demo purposes
      const user = supabase.auth.getUser();
      if (user) {
        // Reset user profile data to ensure fresh onboarding
        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_completed: false,
            has_personality_insights: false,
            preference_chosen: false,
            personality_tiles: null
          })
          .eq('id', '95a5cc01-4480-4dbe-b05b-f02a7ae6788f');
          
        if (error) {
          console.error("Error resetting profile data:", error);
        }
      }
    } catch (error) {
      console.error("Error in demo setup:", error);
    } finally {
      setLoading(false);
      
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 map-grid-bg">
      <div className="w-full max-w-md">
        <Card className="border-scout-200 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-scout-400 to-scout-600 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-scout-500 to-scout-400 bg-clip-text text-transparent">City Scout</CardTitle>
            <CardDescription className="font-medium text-scout-500">
              Your AI City Companion
            </CardDescription>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              Discover personalized recommendations for places, events, and activities tailored to your preferences and schedule.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center py-2 bg-scout-50 rounded-md">
              <p className="text-sm font-medium text-scout-700">
                Continue to City Scout
              </p>
              <p className="text-xs text-scout-600 px-4">
                Proceed to start exploring personalized recommendations
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-scout-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-scout-500" />
                </div>
                <div>
                  <h3 className="font-medium">Discover Places</h3>
                  <p className="text-sm text-muted-foreground">
                    Find destinations based on your interests
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-scout-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-scout-500" />
                </div>
                <div>
                  <h3 className="font-medium">Plan Activities</h3>
                  <p className="text-sm text-muted-foreground">
                    Get activity suggestions that match your preferences
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-scout-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-scout-500" />
                </div>
                <div>
                  <h3 className="font-medium">Personalized Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Tailored recommendations just for you
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
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Connect;
