
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Define interfaces for Google Drive Picker
interface PickerDocument {
  id: string;
  name: string;
  mimeType: string;
  lastEditedUtc: number;
  sizeBytes: number;
  url: string;
  iconUrl: string;
}

interface PickerResult {
  action: string;
  docs: PickerDocument[];
}

interface GDrivePickerProps {
  onFileSelected: (file: { id: string; name: string; mimeType: string }) => void;
  accept?: string[];
  buttonText?: string;
}

const GDrivePicker: React.FC<GDrivePickerProps> = ({
  onFileSelected,
  accept = ['application/json'],
  buttonText = 'Select from Google Drive'
}) => {
  const { user } = useAuth();
  const [pickerInited, setPickerInited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Important: Use your own API keys here
  // These should be client-side keys only (no sensitive data)
  const GOOGLE_API_KEY = 'AIzaSyDguTyNH_C-0o1PfGi6xKcG4M0AmHPDTEA';
  const GOOGLE_CLIENT_ID = '275978527393-kkc48fjhr42gt58sda1hs9mltvmq0e8b.apps.googleusercontent.com';
  const GOOGLE_APP_ID = '275978527393';

  useEffect(() => {
    // Load Google API scripts
    const loadGoogleScripts = () => {
      // First, load the Google API client
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = initGapiClient;
      document.body.appendChild(gapiScript);

      // Then, load the Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = initGisClient;
      document.body.appendChild(gisScript);
    };

    loadGoogleScripts();
  }, []);

  // Initialize Google API client
  const initGapiClient = () => {
    window.gapi.load('client:picker', async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        setGapiLoaded(true);
        console.log("Google API client initialized");
      } catch (error) {
        console.error('Error initializing Google API client:', error);
        toast.error('Failed to initialize Google Drive API');
        setLoading(false);
      }
    });
  };

  // Initialize Google Identity Services
  const initGisClient = () => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.error) {
            console.error('Error getting access token:', response);
            toast.error('Failed to authenticate with Google');
            setLoading(false);
            return;
          }
          setTokenClient(client);
          setGisLoaded(true);
          if (gapiLoaded) {
            setPickerInited(true);
          }
          console.log("Google Identity Services initialized");
        },
      });
      setTokenClient(client);
    } catch (error) {
      console.error('Error initializing Google Identity Services:', error);
      toast.error('Failed to initialize Google authentication');
      setLoading(false);
    }
  };

  const createPicker = () => {
    setLoading(true);

    if (!gapiLoaded || !gisLoaded) {
      toast.error('Google APIs not fully loaded. Please try again in a moment.');
      setLoading(false);
      return;
    }

    // Request an access token
    if (tokenClient) {
      try {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        console.error('Error requesting access token:', error);
        toast.error('Failed to authenticate with Google');
        setLoading(false);
      }
    } else {
      // Fallback to alternative authentication if tokenClient isn't available
      const authInstance = window.gapi.auth2?.getAuthInstance();
      if (!authInstance) {
        toast.error('Google authentication not initialized. Please refresh and try again.');
        setLoading(false);
        return;
      }

      if (!authInstance.isSignedIn.get()) {
        authInstance.signIn().then(
          () => createAndShowPicker(authInstance.currentUser.get().getAuthResponse().access_token),
          (error: any) => {
            console.error('Error signing in to Google:', error);
            toast.error('Failed to sign in to Google Drive');
            setLoading(false);
          }
        );
      } else {
        createAndShowPicker(authInstance.currentUser.get().getAuthResponse().access_token);
      }
    }
  };

  const createAndShowPicker = (accessToken: string) => {
    if (!window.google || !window.google.picker) {
      // Try to load the picker API if it's not already loaded
      window.gapi.load('picker', () => {
        try {
          createPickerWithToken(accessToken);
        } catch (error) {
          console.error('Error creating picker:', error);
          toast.error('Failed to load Google Drive Picker');
          setLoading(false);
        }
      });
    } else {
      createPickerWithToken(accessToken);
    }
  };

  const createPickerWithToken = (accessToken: string) => {
    if (!window.google || !window.google.picker) {
      toast.error('Google Picker API not loaded');
      setLoading(false);
      return;
    }

    try {
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      
      // Filter for JSON files if specified
      if (accept && accept.length > 0) {
        view.setMimeTypes(accept.join(','));
      }
      
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
        .setAppId(GOOGLE_APP_ID)
        .setOAuthToken(accessToken)
        .addView(view)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback(pickerCallback)
        .build();
        
      picker.setVisible(true);
    } catch (error) {
      console.error('Error creating picker:', error);
      toast.error('Failed to open Google Drive Picker');
      setLoading(false);
    }
  };

  const pickerCallback = (data: PickerResult) => {
    if (data.action === 'picked') {
      const file = data.docs[0];
      if (file) {
        onFileSelected({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType
        });
      }
    }
    setLoading(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={createPicker}
      disabled={loading || !gapiLoaded || !gisLoaded}
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
};

// Add type definitions for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
    onApiLoad: () => void;
  }
}

export default GDrivePicker;
