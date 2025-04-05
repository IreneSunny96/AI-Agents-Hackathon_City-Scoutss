
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
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const GOOGLE_API_KEY = 'AIzaSyDguTyNH_C-0o1PfGi6xKcG4M0AmHPDTEA'; // This is a client-side API key, it's okay to be public
  const GOOGLE_CLIENT_ID = '275978527393-kkc48fjhr42gt58sda1hs9mltvmq0e8b.apps.googleusercontent.com'; // This is a client-side ID, it's okay to be public
  const GOOGLE_APP_ID = '275978527393';

  useEffect(() => {
    // Load Google Drive API
    const loadGoogleDriveApi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2:picker', initClient);
      };
      script.onerror = () => {
        toast.error('Failed to load Google Drive API');
        setLoading(false);
      };
      document.body.appendChild(script);
    };

    const initClient = () => {
      window.gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        clientId: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      }).then(() => {
        setPickerApiLoaded(true);
        loadPickerScript();
      }).catch((error: any) => {
        console.error('Error initializing Google API client:', error);
        toast.error('Failed to initialize Google Drive');
        setLoading(false);
      });
    };

    const loadPickerScript = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js?onload=onApiLoad';
      script.onload = () => {
        setPickerInited(true);
        setLoading(false);
      };
      script.onerror = () => {
        toast.error('Failed to load Google Drive Picker');
        setLoading(false);
      };
      document.body.appendChild(script);
    };

    if (!pickerApiLoaded) {
      loadGoogleDriveApi();
    }
  }, [pickerApiLoaded]);

  const createPicker = () => {
    setLoading(true);

    if (!window.gapi || !window.google) {
      toast.error('Google API not loaded. Please try again.');
      setLoading(false);
      return;
    }

    // Check if user is signed in to Google
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      authInstance.signIn().then(
        () => {
          createAndShowPicker(authInstance.currentUser.get().getAuthResponse().access_token);
        },
        (error: any) => {
          console.error('Error signing in to Google:', error);
          toast.error('Failed to sign in to Google Drive');
          setLoading(false);
        }
      );
    } else {
      createAndShowPicker(authInstance.currentUser.get().getAuthResponse().access_token);
    }
  };

  const createAndShowPicker = (accessToken: string) => {
    if (!window.google) {
      toast.error('Google Picker API not loaded');
      setLoading(false);
      return;
    }

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    
    // Filter for JSON files
    view.setMimeTypes(accept.join(','));
    
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
      disabled={loading || !pickerInited}
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
