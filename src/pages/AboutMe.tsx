
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AboutMe = () => {
  const { user, signOut } = useAuth();
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
        
        // Try to get the report from storage
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
  
  const formatReport = (text: string) => {
    // Split by double newlines to separate paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((paragraph, index) => {
      // Check if this is a heading (using simple heuristics)
      if (paragraph.match(/^[🍜🧘‍♂️🎭✈️🏙️🔎]/) || paragraph.includes(':')) {
        // This looks like a heading or section title
        return <h2 key={index} className="text-xl font-semibold mt-6 mb-3">{paragraph}</h2>;
      }
      
      // Check for bullet points
      if (paragraph.includes('- ')) {
        const listItems = paragraph.split(/\n- /);
        
        // First part might be a section title without bullet
        const title = listItems.shift()?.replace('- ', '');
        
        return (
          <div key={index} className="mb-4">
            {title && !title.match(/^\s*$/) && <p className="mb-2">{title}</p>}
            <ul className="list-disc pl-6 space-y-1">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      // Regular paragraph
      return <p key={index} className="mb-4">{paragraph}</p>;
    });
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
          <p className="text-lg text-muted-foreground mb-6">
            A detailed analysis of your preferences and personality based on your activity data
          </p>
          
          {!personalityReport ? (
            <Card className="mb-8 bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <h2 className="text-xl font-semibold mb-2">No Personality Report Available</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  You haven't generated a personality report yet. Go to the home page and upload your activity data to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Personality Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {formatReport(personalityReport)}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-center mb-8">
            <Button 
              onClick={() => navigate('/')}
              className="bg-scout-500 hover:bg-scout-600"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutMe;
