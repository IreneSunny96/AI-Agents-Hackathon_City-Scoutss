
import React from 'react';
import { Button } from '../ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
}

const GoogleButton: React.FC<GoogleButtonProps> = ({ 
  onClick, 
  loading = false 
}) => {
  const handleDemoLogin = async () => {
    try {
      // For demo purposes, we'll use signInWithPassword with a demo email/password
      // This simulates logging in as our demo user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "demo@cityscout.ai",
        password: "demo-password-123"
      });
      
      if (error) {
        console.error("Demo login error:", error);
        
        // If the user doesn't exist yet, create it
        if (error.message.includes("Invalid login credentials")) {
          console.log("Creating demo user account...");
          const { error: signUpError } = await supabase.auth.signUp({
            email: "demo@cityscout.ai",
            password: "demo-password-123",
            options: {
              data: {
                id: "95a5cc01-4480-4dbe-b05b-f02a7ae6788f"
              }
            }
          });
          
          if (signUpError) {
            console.error("Error creating demo account:", signUpError);
            toast.error("Could not create demo account");
          } else {
            // Try signing in again after account creation
            await supabase.auth.signInWithPassword({
              email: "demo@cityscout.ai",
              password: "demo-password-123"
            });
          }
        } else {
          toast.error("Demo login failed");
        }
      } else {
        console.log("Demo login successful");
      }
      
      // Call the original onClick handler to continue the flow
      onClick();
    } catch (error) {
      console.error("Error in demo login:", error);
      toast.error("Login failed");
    }
  };

  return (
    <Button
      onClick={handleDemoLogin}
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
  );
};

export default GoogleButton;
