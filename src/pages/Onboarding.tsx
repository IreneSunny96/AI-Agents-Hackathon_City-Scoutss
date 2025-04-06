
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import Connect from '@/components/onboarding/Connect';

const Onboarding = () => {
  const { updateProfile, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleConnectComplete = async () => {
    try {
      setLoading(true);
      
      // Mark onboarding as complete for the user when they click "Continue with Google"
      if (user) {
        await updateProfile({
          onboarding_completed: true,
        });
      }
      
      // Navigate to the main page
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Connect onComplete={handleConnectComplete} />
  );
};

export default Onboarding;
