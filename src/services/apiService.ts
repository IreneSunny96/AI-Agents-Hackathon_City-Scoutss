
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
    // Get the token from local storage or session
    const token = localStorage.getItem('sb-zgdrcbdrmnhvfzygyecx-auth-token');
    let authToken = '';
    
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        authToken = parsedToken.access_token || '';
      } catch (e) {
        console.error('Error parsing auth token:', e);
      }
    }
    
    console.log('Sending activity data to Edge Function, data length:', JSON.stringify(activityData).length);
    
    const response = await fetch(`https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/process-places-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId,
        activityData
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function response error:', response.status, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Unknown error' };
      }
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing places data:', error);
    throw error;
  }
};

/**
 * Generates personality insights based on processed data
 * @param userId The user's ID
 */
export const generatePersonalityInsights = async (userId: string) => {
  try {
    // Get the token from local storage or session
    const token = localStorage.getItem('sb-zgdrcbdrmnhvfzygyecx-auth-token');
    let authToken = '';
    
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        authToken = parsedToken.access_token || '';
      } catch (e) {
        console.error('Error parsing auth token:', e);
      }
    }
    
    const response = await fetch(`https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-personality-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function response error:', response.status, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Unknown error' };
      }
      
      if (errorText.includes('OPENAI_API_KEY not found')) {
        throw new Error('OpenAI API key is missing. Please configure it in Supabase Edge Function Secrets.');
      }
      
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating personality insights:', error);
    throw error;
  }
};
