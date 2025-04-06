
import React from 'react';
import Header from '@/components/layout/Header';
import Map from '@/components/map/Map';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const DiscoverPlaces = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
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
          
          <div className="mb-6">
            <p className="text-muted-foreground">
              Explore places near your current location that match your interests.
            </p>
          </div>
          
          <div className="space-y-8">
            <Map className="shadow-md border border-border" />
            
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
