
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MapProps {
  className?: string;
  searchTerm?: string | null;
  category?: string | null;
}

interface Place {
  id: string;
  name: string;
  location: [number, number];
  category: string;
  description?: string;
}

const Map: React.FC<MapProps> = ({ className, searchTerm, category }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const placeMarkers = useRef<mapboxgl.Marker[]>([]);

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

  // Search for places when searchTerm changes
  useEffect(() => {
    if (!map.current || !userLocation || !searchTerm) return;
    
    const searchForPlaces = async () => {
      setSearchLoading(true);
      
      try {
        // Clear previous markers
        placeMarkers.current.forEach(marker => marker.remove());
        placeMarkers.current = [];
        
        // Make API call to Mapbox to get places based on search term
        const query = encodeURIComponent(`${searchTerm} near me`);
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?` +
          `proximity=${userLocation[0]},${userLocation[1]}&` +
          `access_token=${mapboxToken}&` +
          `limit=5`
        );
        
        if (!response.ok) {
          throw new Error('Failed to search for places');
        }
        
        const data = await response.json();
        
        // Create place objects from the response
        const foundPlaces: Place[] = data.features.map((feature: any) => ({
          id: feature.id,
          name: feature.text,
          location: feature.center,
          category: feature.properties?.category || category || 'Unknown',
          description: feature.place_name
        }));
        
        setPlaces(foundPlaces);
        
        // Add markers for each place
        foundPlaces.forEach(place => {
          // Create custom popup content
          const popupContent = `
            <div class="p-2">
              <h3 class="font-bold">${place.name}</h3>
              <p class="text-sm text-gray-700">${place.description || ''}</p>
              <p class="text-xs mt-1 text-scout-500">${place.category}</p>
            </div>
          `;
          
          // Create and add marker
          const marker = new mapboxgl.Marker({ color: '#3FB1CE' })
            .setLngLat(place.location)
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
            .addTo(map.current!);
          
          placeMarkers.current.push(marker);
        });
        
        // Adjust map to show all markers
        if (foundPlaces.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          
          // Add user location to bounds
          bounds.extend(userLocation);
          
          // Add all place locations to bounds
          foundPlaces.forEach(place => {
            bounds.extend(place.location);
          });
          
          map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
          });
          
          toast.success(`Found ${foundPlaces.length} places near you`);
        } else {
          toast.info('No places found for this search term');
        }
      } catch (error) {
        console.error('Error searching for places:', error);
        toast.error('Failed to search for places');
      } finally {
        setSearchLoading(false);
      }
    };
    
    searchForPlaces();
  }, [searchTerm, mapboxToken, userLocation, category]);

  return (
    <div className={`relative min-h-[500px] w-full rounded-lg overflow-hidden ${className}`}>
      {(loading || searchLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-scout-500" />
            <p className="text-scout-500 font-medium">
              {loading ? 'Loading map...' : 'Searching for places...'}
            </p>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="absolute inset-0" />
      
      {places.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10 max-h-40 overflow-y-auto">
          <h3 className="font-bold text-sm mb-2">Places Found ({places.length})</h3>
          <ul className="space-y-2">
            {places.map(place => (
              <li key={place.id} className="text-sm">
                <span className="font-medium">{place.name}</span>
                <span className="text-xs ml-2 text-gray-500">{place.category}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Map;
