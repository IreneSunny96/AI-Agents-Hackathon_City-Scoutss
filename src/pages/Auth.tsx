import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          return;
        }
        
        if (data.session) {
          console.log("User is already authenticated");
          navigate('/');
        }
      } catch (err) {
        console.error("Error in session check:", err);
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session ? 'session exists' : 'no session');
      
      if (event === 'SIGNED_IN' && session) {
        console.log("User signed in. Redirecting...");
        setLoading(false);
        navigate('/');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      await signInWithEmail(values.email, values.password);
      toast.success('Signed in successfully');
    } catch (error: any) {
      console.error('Email sign in error:', error);
      toast.error(error.message || 'Failed to sign in. Please check your credentials and try again.');
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (values: SignupFormValues) => {
    try {
      setLoading(true);
      await signUpWithEmail(values.email, values.password, { full_name: values.fullName });
      toast.success('Account created successfully. Please check your email for verification.');
      setActiveTab("login");
      setLoading(false);
    } catch (error: any) {
      console.error('Email sign up error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
      setLoading(false);
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
              Discover personalized recommendations for places, events, and activities tailored to your preferences.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleEmailSignIn)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-4">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleEmailSignUp)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 py-6 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-scout-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className="shrink-0"
                  >
                    <path
                      fill="#EA4335"
                      d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                    />
                    <path
                      fill="#34A853"
                      d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                    />
                    <path
                      fill="#4A90E2"
                      d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1272727,9.90909091 L12,9.90909091 L12,14.7272727 L18.4363636,14.7272727 C18.1187732,16.417309 17.2662994,17.7172837 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </Button>
          </CardContent>
          
          <CardFooter className="flex justify-center text-center text-xs text-muted-foreground">
            <p>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
