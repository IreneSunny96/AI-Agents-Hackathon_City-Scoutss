
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DeleteAccountDialog } from '@/components/ui/delete-account-dialog';

const AboutMe = () => {
  const { user, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [personalityReport, setPersonalityReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const fetchPersonalityReport = async () => {
      try {
        setLoading(true);
        
        // First check if the user has confirmed preferences
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('preference_chosen, has_personality_insights')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }
        
        // If preferences haven't been confirmed, don't try to load the report
        if (!profile.preference_chosen || !profile.has_personality_insights) {
          setLoading(false);
          return;
        }
        
        const userFolder = `user_data/${user.id}`;
        const { data, error } = await supabase.storage
          .from('user_files')
          .download(`${userFolder}/personality_report.txt`);
        
        if (error) {
          console.error('Error downloading personality report:', error);
          toast.error('Failed to load your personality report');
        } else {
          const reportText = await data.text();
          setPersonalityReport(reportText);
        }
      } catch (error) {
        console.error('Error fetching personality report:', error);
        toast.error('An error occurred while loading your personality report');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersonalityReport();
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
  
  const formatReportContent = (text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, index) => {
      if (paragraph.match(/^[🍜🧘‍♂️🎭✈️🏙️🔎]/) || paragraph.includes(':')) {
        return <h2 key={index} className="text-xl font-semibold mt-6 mb-3">{paragraph}</h2>;
      }
      
      if (paragraph.includes('- ')) {
        const lines = paragraph.split('\n');
        const listItems = lines.filter(line => line.trim().startsWith('- '));
        const nonListText = lines.filter(line => !line.trim().startsWith('- ')).join('\n');
        
        return (
          <div key={index} className="mb-4">
            {nonListText && <p className="mb-2">{nonListText}</p>}
            <ul className="list-disc pl-6 space-y-1">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex}>{item.replace('- ', '')}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      return <p key={index} className="mb-4">{paragraph}</p>;
    });
  };
  
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success('Your account has been deleted successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete your account. Please try again.');
    }
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
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">
              About Me
            </h1>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <p className="text-lg text-muted-foreground">
              A detailed analysis of your preferences and personality based on your activity data
            </p>
            <Button 
              onClick={() => navigate('/profile')}
              className="bg-scout-500 hover:bg-scout-600"
            >
              View Preferences
            </Button>
          </div>
          
          {!personalityReport ? (
            <Card className="mb-8 bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <h2 className="text-xl font-semibold mb-2">No Personality Report Available</h2>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {!loading ? 
                    "You haven't confirmed your preferences yet. Go to the preferences page to complete your profile." : 
                    "You haven't generated a personality report yet. Go to the home page and upload your activity data to get started."}
                </p>
                <Button 
                  onClick={() => navigate('/preferences')}
                  className="bg-scout-500 hover:bg-scout-600"
                >
                  Complete Preferences
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Personality Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {formatReportContent(personalityReport)}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex flex-col items-center space-y-4 mb-8">
            <Button 
              onClick={() => navigate('/')}
              className="bg-scout-500 hover:bg-scout-600"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
            
            <DeleteAccountDialog onConfirm={handleDeleteAccount} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutMe;
