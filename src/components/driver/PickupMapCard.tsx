
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";

interface PickupMapCardProps {
  address: string;
  locationName: string;
  orderId: string;
}

export function PickupMapCard({ address, locationName, orderId }: PickupMapCardProps) {
  const openDirections = () => {
    // Use address-based directions
    const encodedAddress = encodeURIComponent(address);
    
    // Detect mobile device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open native Google Maps app first, fallback to web
      const googleMapsUrl = `comgooglemaps://?daddr=${encodedAddress}&directionsmode=driving`;
      const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      
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
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`, '_blank');
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-2 text-slate-700 mb-3">
          <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-sm text-purple-900">{locationName || 'Pickup Location'}</div>
            <div className="text-sm text-purple-700">{address}</div>
          </div>
        </div>
        
        <Button
          onClick={openDirections}
          size="sm"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions to Pickup
        </Button>
      </div>
    </div>
  );
}
