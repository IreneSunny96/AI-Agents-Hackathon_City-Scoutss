
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Map from '@/components/map/Map';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Type for personality tile categories
type TileCategory = 
  | 'Lifestyle Vibes' 
  | 'Food & Drink Favorites' 
  | 'Go-to Activities'
  | 'Favorite Neighborhoods or Place Types'
  | 'Travel & Exploration'
  | 'Other';

const DiscoverPlaces = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<TileCategory | null>(null);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [personalityTiles, setPersonalityTiles] = useState<Record<string, string[]> | null>(null);

  // Extract personality tiles from profile
  useEffect(() => {
    if (profile?.personality_tiles) {
      setPersonalityTiles(profile.personality_tiles as unknown as Record<string, string[]>);
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleCategorySelect = (category: TileCategory) => {
    setSelectedCategory(category);
    setSelectedTile(null);
  };

  const handleTileSelect = (tile: string) => {
    setSelectedTile(tile);
    toast.success(`Searching for places related to "${tile}"`);
  };

  // Array of all categories for display
  const categories: TileCategory[] = [
    'Lifestyle Vibes',
    'Food & Drink Favorites',
    'Go-to Activities',
    'Favorite Neighborhoods or Place Types',
    'Travel & Exploration',
    'Other'
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleBackClick}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Discover Places</h1>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-muted-foreground">
              Explore places near your current location that match your interests.
            </p>
          </div>
          
          {/* Category selection */}
          <div className="mb-4 overflow-x-auto pb-2">
            <div className="flex space-x-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={selectedCategory === category ? "bg-scout-500 hover:bg-scout-600" : ""}
                  onClick={() => handleCategorySelect(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Tiles for selected category */}
          {selectedCategory && personalityTiles && personalityTiles[selectedCategory] && (
            <div className="mb-4 overflow-x-auto pb-2">
              <div className="flex flex-wrap gap-2 mb-4">
                {personalityTiles[selectedCategory].map((tile) => (
                  <Badge
                    key={tile}
                    variant={selectedTile === tile ? "default" : "outline"}
                    className={`cursor-pointer text-sm px-3 py-1 ${
                      selectedTile === tile 
                        ? "bg-scout-500 hover:bg-scout-600 text-white" 
                        : "hover:bg-scout-100 dark:hover:bg-scout-800"
                    }`}
                    onClick={() => handleTileSelect(tile)}
                  >
                    {tile}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <Map 
              className="shadow-md border border-border" 
              searchTerm={selectedTile}
              category={selectedCategory}
            />
            
            <div className="p-4 bg-scout-50 dark:bg-scout-900/20 rounded-lg">
              <p className="text-sm text-scout-800 dark:text-scout-200">
                <strong>Note:</strong> Make sure to allow location access in your browser to see places near you.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiscoverPlaces;
