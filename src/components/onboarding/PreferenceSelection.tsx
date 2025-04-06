
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Define the structure of personality tiles data
interface PersonalityTiles {
  'Lifestyle Vibes': string[];
  'Food & Drink Favorites': string[];
  'Go-to Activities': string[];
  'Favorite Neighborhoods or Place Types': string[];
  'Travel & Exploration': string[];
  'Other': string[];
  [key: string]: string[];
}

// Define step interface
interface StepData {
  title: string;
  description: string;
  field: keyof PersonalityTiles;
}

const PreferenceSelection = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [personalityTiles, setPersonalityTiles] = useState<PersonalityTiles | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<Record<string, string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // Define the steps in the wizard
  const steps: StepData[] = [
    {
      title: 'Lifestyle Vibes',
      description: 'These lifestyle choices were identified based on your activity data. Uncheck any that don\'t match your preferences.',
      field: 'Lifestyle Vibes'
    },
    {
      title: 'Food & Drink Favorites',
      description: 'These are the food and drink preferences we identified from your data. Uncheck any that don\'t match your taste.',
      field: 'Food & Drink Favorites'
    },
    {
      title: 'Go-to Activities',
      description: 'Here are activities you seem to enjoy. Uncheck any that don\'t interest you.',
      field: 'Go-to Activities'
    },
    {
      title: 'Favorite Places',
      description: 'These are neighborhoods and place types you frequently visit. Uncheck any that aren\'t your favorites.',
      field: 'Favorite Neighborhoods or Place Types'
    },
    {
      title: 'Travel & Exploration',
      description: 'Here are travel preferences based on your data. Uncheck any that don\'t match your style.',
      field: 'Travel & Exploration'
    },
    {
      title: 'Other Interests',
      description: 'Additional interests we identified from your data. Uncheck any that don\'t apply to you.',
      field: 'Other'
    }
  ];

  // Calculate progress percentage
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    // Fetch personality tiles data on component mount
    const fetchPersonalityTiles = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('personality_tiles')
          .eq('id', user.id)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (profile && profile.personality_tiles) {
          // Fix: Properly type and cast the personality_tiles
          const tilesData = profile.personality_tiles as PersonalityTiles;
          setPersonalityTiles(tilesData);
          
          // Initialize selection state with all items selected
          const initialSelections: Record<string, string[]> = {};
          Object.keys(tilesData).forEach(key => {
            if (Array.isArray(tilesData[key]) && !key.includes('Reason')) {
              initialSelections[key] = [...tilesData[key]];
            }
          });
          
          setSelectedTiles(initialSelections);
        } else {
          toast.error('No personality data found. Please generate insights first.');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching personality tiles:', error);
        toast.error('Failed to load personality data');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalityTiles();
  }, [user, navigate]);

  // Handle tile selection/deselection
  const handleTileToggle = (category: string, tile: string) => {
    setSelectedTiles(prev => {
      const currentTiles = prev[category] || [];
      
      if (currentTiles.includes(tile)) {
        // Remove tile if already selected
        return {
          ...prev,
          [category]: currentTiles.filter(t => t !== tile)
        };
      } else {
        // Add tile if not selected
        return {
          ...prev,
          [category]: [...currentTiles, tile]
        };
      }
    });
  };

  // Handle next step button click
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  // Handle previous step button click
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle completion of the wizard
  const handleComplete = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Update the profile with selected tiles
      if (personalityTiles) {
        const updatedTiles = { ...personalityTiles };
        
        // Update each category with selected tiles
        Object.keys(selectedTiles).forEach(category => {
          updatedTiles[category] = selectedTiles[category];
        });
        
        // Update profile in database
        await updateProfile({
          personality_tiles: updatedTiles
        });
        
        toast.success('Your preferences have been saved!');
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save your preferences');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-scout-500 mb-4" />
              <p className="text-lg font-medium">Loading your preferences...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Current step data
  const currentStepData = steps[currentStep];
  const currentField = currentStepData.field;
  const currentTiles = personalityTiles ? personalityTiles[currentField] : [];
  const selectedTilesForCurrentStep = selectedTiles[currentField] || [];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Your {currentStepData.title}</CardTitle>
          <CardDescription className="mt-2">
            {currentStepData.description}
          </CardDescription>
          <Progress value={progressPercentage} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep + 1} of {steps.length}
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentTiles && currentTiles.map((tile) => (
              <div
                key={tile}
                className={`
                  relative p-4 rounded-lg border transition-all cursor-pointer
                  ${selectedTilesForCurrentStep.includes(tile) 
                    ? 'bg-scout-50 border-scout-200' 
                    : 'bg-card border-input hover:bg-accent/50'}
                `}
                onClick={() => handleTileToggle(currentField as string, tile)}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedTilesForCurrentStep.includes(tile)}
                    className="mt-0.5 data-[state=checked]:bg-scout-500 data-[state=checked]:border-scout-500"
                    onCheckedChange={() => handleTileToggle(currentField as string, tile)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{tile}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <Button 
            onClick={handleNext}
            className="bg-scout-500 hover:bg-scout-600"
            disabled={loading}
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PreferenceSelection;
