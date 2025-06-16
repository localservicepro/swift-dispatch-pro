
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Clock, Truck, ArrowLeft } from "lucide-react";
import { mapboxService } from "@/services/mapboxService";
import { locationService, LocationData } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";

// Temporary Mapbox token - replace with your own
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

interface DeliveryMapViewProps {
  order: any;
  onBack: () => void;
  onStatusUpdate: () => void;
}

export function DeliveryMapView({ order, onBack, onStatusUpdate }: DeliveryMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.0066, 40.7135], // Default to NYC, will update with user location
      zoom: 13,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Get current location and initialize route
    initializeLocation();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  const initializeLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);

      if (map.current) {
        // Center map on current location
        map.current.setCenter([location.longitude, location.latitude]);

        // Add current location marker
        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(new mapboxgl.Popup().setHTML('<div>Your Location</div>'))
          .addTo(map.current);

        // Calculate route to delivery address
        await calculateRoute(location);
      }
    } catch (error) {
      console.error('Failed to get current location:', error);
      toast({
        title: "Location Error",
        description: "Unable to get your current location. Please enable location services.",
        variant: "destructive",
      });
    }
  };

  const calculateRoute = async (fromLocation: LocationData) => {
    try {
      // For demo purposes, using a sample destination coordinate
      // In real implementation, you'd geocode the customer address
      const destinationCoords: [number, number] = [-74.0020, 40.7200]; // Sample NYC coordinate

      const routeResponse = await mapboxService.getRoute({
        coordinates: [
          [fromLocation.longitude, fromLocation.latitude],
          destinationCoords
        ],
        profile: 'driving',
      });

      if (routeResponse.routes.length > 0) {
        const route = routeResponse.routes[0];
        
        // Display route info
        setRouteInfo({
          duration: mapboxService.formatDuration(route.duration),
          distance: mapboxService.formatDistance(route.distance),
        });

        // Add destination marker
        if (map.current) {
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat(destinationCoords)
            .setPopup(new mapboxgl.Popup().setHTML(`
              <div>
                <strong>${order.customer_name}</strong><br/>
                ${order.customer_address}
              </div>
            `))
            .addTo(map.current);

          // Add route to map
          if (map.current.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
          }

          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry,
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
            },
          });

          // Fit map to show entire route
          const coordinates = route.geometry.coordinates;
          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
          map.current.fitBounds(bounds, { padding: 50 });
        }

        // Save route to database
        await mapboxService.saveRouteToDatabase(order.id, order.driver_id, routeResponse);
      }
    } catch (error) {
      console.error('Failed to calculate route:', error);
      toast({
        title: "Route Error",
        description: "Unable to calculate route to destination.",
        variant: "destructive",
      });
    }
  };

  const startNavigation = async () => {
    try {
      setIsNavigating(true);
      await locationService.startTracking(order.driver_id, order.id);
      await mapboxService.updateRouteStatus(order.id, 'active');
      
      toast({
        title: "Navigation Started",
        description: "Real-time tracking is now active.",
      });
    } catch (error) {
      console.error('Failed to start navigation:', error);
      toast({
        title: "Navigation Error",
        description: "Unable to start navigation.",
        variant: "destructive",
      });
      setIsNavigating(false);
    }
  };

  const stopNavigation = () => {
    locationService.stopTracking();
    setIsNavigating(false);
    toast({
      title: "Navigation Stopped",
      description: "Real-time tracking has been stopped.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'loading': return 'bg-orange-100 text-orange-800';
      case 'en_route': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <Card className="rounded-none border-b">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery to {order.customer_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4" />
            {order.customer_address}
          </div>
          
          {routeInfo && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{routeInfo.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Navigation className="w-4 h-4 text-green-600" />
                <span className="font-medium">{routeInfo.distance}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isNavigating ? (
              <Button onClick={startNavigation} className="flex-1">
                <Navigation className="w-4 h-4 mr-2" />
                Start Navigation
              </Button>
            ) : (
              <Button onClick={stopNavigation} variant="destructive" className="flex-1">
                Stop Navigation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {isNavigating && (
          <div className="absolute top-4 left-4 right-4">
            <Card className="bg-blue-600 text-white border-blue-600">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Navigation Active</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
