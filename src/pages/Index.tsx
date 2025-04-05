
import React from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Search, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const Index = () => {
  const { profile, signOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">
              Welcome {profile?.full_name ? `${profile.full_name.split(' ')[0]}` : ''} to CityScout
            </h1>
            <p className="text-lg text-muted-foreground">
              Your AI companion for exploring the city based on your interests
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 shadow-sm">
              <div className="mb-4">
                <div className="h-12 w-12 rounded-full bg-scout-100 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-scout-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Discover Places</h2>
              <p className="text-muted-foreground mb-4">
                Find new spots to visit based on your interests and previous activities
              </p>
              <Button className="w-full" variant="outline">
                <span>Explore</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 shadow-sm">
              <div className="mb-4">
                <div className="h-12 w-12 rounded-full bg-scout-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-scout-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Plan Your Day</h2>
              <p className="text-muted-foreground mb-4">
                Get personalized itineraries that fit your schedule and preferences
              </p>
              <Button className="w-full" variant="outline">
                <span>Plan Now</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-scout-500/10 to-scout-400/5 rounded-2xl p-8 border border-scout-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Where to next?</h2>
              <p className="text-muted-foreground">
                Let CityScout find your next adventure
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                className="bg-white dark:bg-gray-800 border border-input h-12 rounded-lg pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-scout-500 focus:border-transparent"
                placeholder="Search for places or activities..."
              />
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 CityScout - Your AI Companion for City Exploration</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
