
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";

interface DeliveryMapCardProps {
  address: string;
  customerName: string;
  orderId: string;
}

export function DeliveryMapCard({ address, customerName, orderId }: DeliveryMapCardProps) {
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
    <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-lg overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3 text-slate-700 mb-4">
          <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-base mb-1">{customerName}</div>
            <div className="text-sm text-slate-600 leading-relaxed">{address}</div>
          </div>
        </div>
        
        <Button
          onClick={openDirections}
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 animate-pulse hover:animate-none"
        >
          <Navigation className="w-5 h-5 mr-2" />
          Get Directions
        </Button>
      </div>
    </div>
  );
}
