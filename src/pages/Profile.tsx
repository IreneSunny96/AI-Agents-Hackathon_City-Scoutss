import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Calendar, User, Loader2, Hash, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExtendedProfile } from '@/types/profiles';

interface PersonalityTiles {
  "Lifestyle Vibes": string[];
  "Lifestyle Vibes Reason": string;
  "Food & Drink Favorites": string[];
  "Food & Drink Favorites Reason": string;
  "Go-to Activities": string[];
  "Go-to Activities Reason": string;
  "Favorite Neighborhoods or Place Types": string[];
  "Favorite Neighborhoods or Place Types Reason": string;
  "Travel & Exploration": string[];
  "Travel & Exploration Reason": string;
  "Other": string[];
  "Other Reason": string;
}

const Profile = () => {
  const { user, profile: authProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [personalityReport, setPersonalityReport] = useState<string | null>(null);
  const [personalityTiles, setPersonalityTiles] = useState<PersonalityTiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const fetchPersonalityData = async () => {
      try {
        setLoading(true);
        
        // Fetch the complete profile including preference_chosen
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }
        
        setExtendedProfile(profileData as ExtendedProfile);
        
        // First check if user has confirmed preferences
        if (!profileData.preference_chosen) {
          // If preferences haven't been chosen yet but personality_tiles exist, redirect to preferences
          if (profileData.personality_tiles) {
            // Add a toast to inform the user
            toast({
              title: "Complete Your Preferences",
              description: "Please complete your preference selection before viewing your profile.",
              variant: "default"
            });
            navigate('/preferences');
            return;
          }
        }
        
        // Get the tiles from the profile if available and preferences are chosen
        if (profileData.personality_tiles && profileData.preference_chosen) {
          setPersonalityTiles(profileData.personality_tiles as unknown as PersonalityTiles);
        }
        
        // Only try to get the report if preferences have been chosen
        if (profileData.preference_chosen) {
          // Try to get the report from storage
          const userFolder = `user_data/${user.id}`;
          const { data, error } = await supabase.storage
            .from('user_files')
            .download(`${userFolder}/personality_report.txt`);
          
          if (error) {
            console.error('Error downloading personality report:', error);
            // Not showing error to user as it's not critical
          } else {
            const reportText = await data.text();
            setPersonalityReport(reportText);
          }
        }
      } catch (error) {
        console.error('Error fetching personality data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersonalityData();
  }, [user, navigate]);
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
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
  
  if (extendedProfile && !extendedProfile.preference_chosen) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onLogout={handleLogout} />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-8">
              <Button 
                variant="outline" 
                size="icon" 
                className="mr-4"
                onClick={handleGoBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Your Personality Profile
                </h1>
                <p className="text-lg text-muted-foreground">
                  You need to confirm your preferences before viewing your profile
                </p>
              </div>
            </div>
            
            <Card className="mb-8 bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-scout-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-scout-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Preferences Not Confirmed</h2>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {extendedProfile.personality_tiles ? 
                    "You need to confirm your preferences before you can view your personality profile." :
                    "You haven't generated personality insights yet. Go back to the home page and upload your activity data to get started."}
                </p>
                
                <Button 
                  onClick={() => extendedProfile.personality_tiles ? navigate('/preferences') : navigate('/')}
                  className="bg-scout-500 hover:bg-scout-600"
                >
                  {extendedProfile.personality_tiles ? "Confirm Preferences" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
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
          <div className="flex items-center mb-8">
            <Button 
              variant="outline" 
              size="icon" 
              className="mr-4"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Your Personality Profile
              </h1>
              <p className="text-lg text-muted-foreground">
                Based on your activity data, we've generated insights about your preferences
              </p>
            </div>
          </div>
          
          {!personalityTiles ? (
            <Card className="mb-8 bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-scout-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-scout-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Insights Available</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  You haven't generated personality insights yet. Go back to the home page and upload your activity data to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-scout-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-scout-500" />
                      </div>
                      <div>
                        <CardTitle>Lifestyle Vibes</CardTitle>
                        <CardDescription>Your overall personality and interests</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {personalityTiles["Lifestyle Vibes"].map((vibe, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1 bg-scout-50 text-scout-900">
                          {vibe}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personalityTiles["Lifestyle Vibes Reason"]}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-scout-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-scout-500" />
                      </div>
                      <div>
                        <CardTitle>Food & Drink Favorites</CardTitle>
                        <CardDescription>Your culinary preferences</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {personalityTiles["Food & Drink Favorites"].map((food, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1 bg-scout-50 text-scout-900">
                          {food}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personalityTiles["Food & Drink Favorites Reason"]}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-scout-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-scout-500" />
                      </div>
                      <div>
                        <CardTitle>Go-to Activities</CardTitle>
                        <CardDescription>Activities you frequently engage in</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {personalityTiles["Go-to Activities"].map((activity, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1 bg-scout-50 text-scout-900">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personalityTiles["Go-to Activities Reason"]}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-scout-100 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-scout-500" />
                      </div>
                      <div>
                        <CardTitle>Favorite Places</CardTitle>
                        <CardDescription>Neighborhoods and places you love</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {personalityTiles["Favorite Neighborhoods or Place Types"].map((place, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1 bg-scout-50 text-scout-900">
                          {place}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personalityTiles["Favorite Neighborhoods or Place Types Reason"]}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* More personality tiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-scout-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-scout-500" />
                      </div>
                      <div>
                        <CardTitle>Travel & Exploration</CardTitle>
                        <CardDescription>Your travel style and preferences</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {personalityTiles["Travel & Exploration"].map((travel, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1 bg-scout-50 text-scout-900">
                          {travel}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personalityTiles["Travel & Exploration Reason"]}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full bg-scout-100 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-scout-500" />
                      </div>
                      <div>
                        <CardTitle>Other Interests</CardTitle>
                        <CardDescription>Additional things you enjoy</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {personalityTiles["Other"].map((other, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1 bg-scout-50 text-scout-900">
                          {other}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personalityTiles["Other Reason"]}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          
          {personalityReport && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Detailed Personality Report</CardTitle>
                <CardDescription>
                  A comprehensive analysis of your preferences and habits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Use a pre tag to preserve formatting from the report */}
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">{personalityReport}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
