
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
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

  useEffect(() => {
    initializeMap();
  }, [address]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      setMapError(null);

      // Load Google Maps script
      await loadGoogleMapsScript();

      if (!mapRef.current || !window.google) return;

      // Geocode the address
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResult = await new Promise<any[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      const location = geocodeResult[0].geometry.location;
      const coords = { lat: location.lat(), lng: location.lng() };
      setCoordinates(coords);

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom: 15,
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

      // Add marker
      new window.google.maps.Marker({
        position: coords,
        map: map,
        title: `Delivery to ${customerName}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
        }
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to load map');
      setIsLoading(false);
    }
  };

  const openDirections = () => {
    if (!coordinates) {
      // Fallback to address-based directions
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
      return;
    }

    // Use coordinates for more accurate directions
    const { lat, lng } = coordinates;
    
    // Detect mobile device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open native Google Maps app first, fallback to web
      const googleMapsUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      
      // Create a temporary iframe to test if app can be opened
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = googleMapsUrl;
      document.body.appendChild(iframe);
      
      // Fallback to web after 2 seconds
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.open(webFallbackUrl, '_blank');
      }, 2000);
    } else {
      // Desktop - open web version
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
    }
  };

  if (mapError) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">Map unavailable</span>
        </div>
        <Button
          onClick={openDirections}
          size="sm"
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
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
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-32 bg-gray-100"
          style={{ minHeight: '128px' }}
        />
      </div>
      <div className="p-2">
        <Button
          onClick={openDirections}
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions
        </Button>
      </div>
    </div>
  );
}
