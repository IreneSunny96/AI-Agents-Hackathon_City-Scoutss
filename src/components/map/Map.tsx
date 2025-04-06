
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MapProps {
  className?: string;
}

const Map: React.FC<MapProps> = ({ className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);

  // Fetch Mapbox token from Supabase Edge Functions
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          throw new Error(`Failed to get Mapbox token: ${error.message}`);
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          throw new Error('No Mapbox token returned from server');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        toast.error('Could not initialize map. Please try again later.');
        setLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Get user's current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([longitude, latitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location. Using default location.');
          // Default to a central location if geolocation fails
          setUserLocation([-74.006, 40.7128]); // NYC
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      // Default location
      setUserLocation([-74.006, 40.7128]); // NYC
    }
  }, []);

  // Initialize map when token and location are available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !userLocation) return;
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: userLocation,
        zoom: 13,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }));

      map.current.on('load', () => {
        setLoading(false);
        
        // Add user marker
        userMarker.current = new mapboxgl.Marker({ color: '#FF0000' })
          .setLngLat(userLocation)
          .addTo(map.current!);
          
        // Add popup to the marker
        new mapboxgl.Popup({ offset: 25 })
          .setLngLat(userLocation)
          .setHTML('<h3>You are here</h3>')
          .addTo(map.current!);
      });
      
      // Clean up on unmount
      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to initialize map');
      setLoading(false);
    }
  }, [mapboxToken, userLocation]);

  return (
    <div className={`relative min-h-[500px] w-full rounded-lg overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-scout-500" />
            <p className="text-scout-500 font-medium">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
