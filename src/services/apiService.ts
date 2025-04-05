
/**
 * Service for making API calls to your local FastAPI backend
 */

// Update this with your actual local FastAPI URL
const API_BASE_URL = 'http://localhost:8000';

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
