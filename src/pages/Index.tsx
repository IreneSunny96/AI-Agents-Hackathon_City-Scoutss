
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { generatePersonalityInsights, processPlacesData } from '@/services/apiService';
import GDrivePicker from '@/components/GDrivePicker';
import { processUserOnboarding } from '@/services/apiService';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { performAdvancedSearch } from '@/services/apiService';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [personalityInsightsLoading, setPersonalityInsightsLoading] = useState(false);
  const [personalityInsights, setPersonalityInsights] = useState<any>(null);
  const [advancedSearchEnabled, setAdvancedSearchEnabled] = useState(false);
  const [advancedSearchResult, setAdvancedSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const profileFormSchema = z.object({
    firstName: z.string().min(2, {
      message: "First name must be at least 2 characters.",
    }),
    lastName: z.string().min(2, {
      message: "Last name must be at least 2 characters.",
    }),
  })

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  })

  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    toast({
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
  }

  useEffect(() => {
    if (user) {
      setProfileData({
        avatarUrl: user.user_metadata?.avatar_url,
        email: user.email,
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
      });
    }
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (advancedSearchEnabled) {
      try {
        setIsSearching(true);
        setAdvancedSearchResult(null);
        const result = await performAdvancedSearch(searchQuery);
        setAdvancedSearchResult(result.result);
      } catch (error) {
        console.error('Advanced search error:', error);
        toast.error('Advanced search failed: ' + (error as Error).message);
      } finally {
        setIsSearching(false);
      }
    } else {
      setLoading(true);
      // Simulate fetching recommendations from an API
      setTimeout(() => {
        setRecommendations([
          `Recommendation for ${searchQuery} 1`,
          `Recommendation for ${searchQuery} 2`,
          `Recommendation for ${searchQuery} 3`,
        ]);
        setLoading(false);
      }, 1000);
    }
  };

  const toggleAdvancedSearch = () => {
    setAdvancedSearchEnabled(!advancedSearchEnabled);
    setAdvancedSearchResult(null);
  };

  const handleFileSelected = async (file: { id: string; name: string; mimeType: string }) => {
    console.log('Selected file:', file);
    toast.success(`File "${file.name}" selected! Processing...`);

    try {
      setIsProcessing(true);
      const accessToken = await (window as any).google.accounts.oauth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

      // Fetch the content of the selected file from Google Drive
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Error fetching file content:', response);
        toast.error('Failed to fetch file content from Google Drive');
        setIsProcessing(false);
        return;
      }

      const fileContent = await response.json();

      // Call the processPlacesData function
      const result = await processPlacesData(user?.id || '', fileContent);
      console.log('processPlacesData result:', result);
      toast.success('Places data processed successfully!');
    } catch (error) {
      console.error('Error processing places data:', error);
      toast.error('Failed to process places data: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePersonalityInsights = async () => {
    try {
      setPersonalityInsightsLoading(true);
      setPersonalityInsights(null);
      const result = await generatePersonalityInsights(user?.id || '');
      setPersonalityInsights(result);
      toast.success('Personality insights generated successfully!');
    } catch (error) {
      console.error('Error generating personality insights:', error);
      toast.error('Failed to generate personality insights: ' + (error as Error).message);
    } finally {
      setPersonalityInsightsLoading(false);
    }
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      setIsProcessing(true);
      // Call the processUserOnboarding function
      const result = await processUserOnboarding(user?.id || '', data);
      console.log('processUserOnboarding result:', result);
      toast.success('User profile updated successfully!');
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update user profile: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">CityScout</h1>
          <nav>
            {user ? (
              <Button variant="destructive" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            ) : null}
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8 py-12">
          <h1 className="text-4xl font-bold text-center text-primary">
            Discover Your City with AI
          </h1>
          <p className="text-center text-muted-foreground max-w-2xl">
            Explore personalized recommendations for places, activities, and more, tailored to your unique preferences.
          </p>

          <div className="w-full max-w-2xl space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for places, activities, or recommendations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
              <Button 
                variant="default" 
                size="sm" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAdvancedSearch}
                className={advancedSearchEnabled ? "text-primary" : "text-muted-foreground"}
              >
                <Zap className="h-4 w-4 mr-2" />
                {advancedSearchEnabled ? "Advanced Search Activated" : "Activate Advanced Search"}
              </Button>
            </div>
            
            {isSearching && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {advancedSearchResult && (
              <div className="bg-card p-6 rounded-lg shadow-md mt-4 border border-border">
                <h3 className="text-xl font-semibold mb-2 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary" />
                  Advanced Search Results
                </h3>
                <div className="prose prose-sm max-w-none">
                  {advancedSearchResult.split('\n').map((paragraph, idx) => (
                    <p key={idx} className={idx > 0 ? "mt-4" : ""}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-primary">Recommendations</h2>
                <ul className="list-disc list-inside">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="text-foreground">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {user && (
          <Tabs defaultValue="profile" className="w-full max-w-4xl mx-auto">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="data">Data Processing</TabsTrigger>
              <TabsTrigger value="insights">Personality Insights</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Profile</CardTitle>
                  <CardDescription>View and update your profile information.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      {profileData?.avatarUrl ? (
                        <AvatarImage src={profileData?.avatarUrl} alt={profileData?.firstName} />
                      ) : (
                        <AvatarFallback>{profileData?.firstName?.[0]}{profileData?.lastName?.[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{profileData?.firstName} {profileData?.lastName}</p>
                      <p className="text-sm text-muted-foreground">{profileData?.email}</p>
                    </div>
                  </div>

                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit">Update Profile</Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleUpdateProfile(profileData)} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data Processing</CardTitle>
                  <CardDescription>Process your Google Maps data to get personalized insights.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GDrivePicker onFileSelected={handleFileSelected} accept={['application/json']} />
                </CardContent>
                <CardFooter>
                  {isProcessing ? (
                    <Button disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a JSON file from Google Drive to process your data.
                    </p>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>Personality Insights</CardTitle>
                  <CardDescription>Generate personality insights based on your processed data.</CardDescription>
                </CardHeader>
                <CardContent>
                  {personalityInsights ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Generated Insights:</h3>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(personalityInsights, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click the button below to generate personality insights.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={handleGeneratePersonalityInsights} disabled={personalityInsightsLoading}>
                    {personalityInsightsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Insights'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <footer className="bg-secondary py-4 text-center text-muted-foreground">
        <p>&copy; 2024 CityScout. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
