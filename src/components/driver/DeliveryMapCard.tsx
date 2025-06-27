
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2, AlertCircle } from "lucide-react";
import { loadGoogleMapsScript } from "@/utils/googleMapsConfig";

interface DeliveryMapCardProps {
  address: string;
  customerName: string;
  orderId: string;
}

export function DeliveryMapCard({ address, customerName, orderId }: DeliveryMapCardProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    initializeMap();
  }, [address]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      setMapError(null);
      setMapInitialized(false);

      console.log('DeliveryMapCard: Initializing map for address:', address);

      // Load Google Maps script
      await loadGoogleMapsScript();

      if (!mapRef.current) {
        console.error('DeliveryMapCard: Map container not found');
        return;
      }

      if (!window.google?.maps?.Geocoder) {
        throw new Error('Google Maps Geocoder not available');
      }

      // Geocode the address
      const geocoder = new window.google.maps.Geocoder();
      console.log('DeliveryMapCard: Geocoding address:', address);
      
      const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ 
          address: address,
          componentRestrictions: { country: 'AU' } // Restrict to Australia
        }, (results: google.maps.GeocoderResult[], status: string) => {
          console.log('DeliveryMapCard: Geocoding status:', status, 'Results:', results?.length);
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      const location = geocodeResult[0].geometry.location;
      const coords = { lat: location.lat(), lng: location.lng() };
      setCoordinates(coords);
      console.log('DeliveryMapCard: Geocoded coordinates:', coords);

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add marker with custom icon
      const markerIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32)
      };

      new window.google.maps.Marker({
        position: coords,
        map: map,
        title: `Delivery to ${customerName}`,
        icon: markerIcon
      });

      setMapInitialized(true);
      setIsLoading(false);
      console.log('DeliveryMapCard: Map initialized successfully');

    } catch (error) {
      console.error('DeliveryMapCard: Error initializing map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to load map');
      setIsLoading(false);
    }
  };

  const openDirections = () => {
    console.log('DeliveryMapCard: Opening directions for:', address);
    
    // Encode address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Detect mobile device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (coordinates) {
      const { lat, lng } = coordinates;
      console.log('DeliveryMapCard: Using coordinates for directions:', lat, lng);
      
      if (isMobile) {
        // Try to open native Google Maps app first
        const googleMapsUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
        const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        
        // Attempt to open native app
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = googleMapsUrl;
        document.body.appendChild(iframe);
        
        // Fallback to web after short delay
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {
            // Ignore errors removing iframe
          }
          window.open(webFallbackUrl, '_blank');
        }, 1500);
      } else {
        // Desktop - open web version with coordinates
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
      }
    } else {
      // Fallback to address-based directions
      console.log('DeliveryMapCard: Using address-based directions as fallback');
      
      if (isMobile) {
        const googleMapsUrl = `comgooglemaps://?daddr=${encodedAddress}&directionsmode=driving`;
        const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';  
        iframe.src = googleMapsUrl;
        document.body.appendChild(iframe);
        
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {
            // Ignore errors
          }
          window.open(webFallbackUrl, '_blank');
        }, 1500);
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`, '_blank');
      }
    }
  };

  if (mapError) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm">Map unavailable: {mapError}</span>
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {address}
        </div>
        <Button
          onClick={openDirections}
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <span className="text-sm text-gray-600">Loading map...</span>
            </div>
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-32 bg-gray-100"
          style={{ minHeight: '128px' }}
        />
      </div>
      <div className="p-2">
        <div className="text-xs text-gray-600 mb-2 truncate" title={address}>
          📍 {address}
        </div>
        <Button
          onClick={openDirections}
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions
        </Button>
      </div>
    </div>
  );
}
