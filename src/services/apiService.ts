
/**
 * Service for making API calls to your local FastAPI backend
 */

// Update this with your actual local FastAPI URL
const API_BASE_URL = 'http://localhost:8000';

// Supabase project ID for Edge Functions
const SUPABASE_PROJECT_ID = 'zgdrcbdrmnhvfzygyecx';

/**
 * Processes user data through the Python backend
 * @param userId The user's ID
 * @param profileData Any additional profile data needed by the backend
 */
export const processUserOnboarding = async (userId: string, profileData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/process-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        ...profileData
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Python backend:', error);
    throw error;
  }
};

/**
 * Processes user places data through the Supabase Edge Function
 * @param userId The user's ID
 * @param activityData The Google activity data to process
 */
export const processPlacesData = async (userId: string, activityData: any[]) => {
  try {
    const response = await fetch(`https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/process-places-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      },
      body: JSON.stringify({
        userId,
        activityData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing places data:', error);
    throw error;
  }
};
