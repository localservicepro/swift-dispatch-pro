
import { useState, useEffect, useCallback } from "react";
import { locationService, LocationData } from "@/services/locationService";
import { supabase } from "@/integrations/supabase/client";

interface UseLocationTrackingProps {
  driverId: string;
  orderId?: string;
  autoStart?: boolean;
}

export function useLocationTracking({ driverId, orderId, autoStart = false }: UseLocationTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      await locationService.startTracking(driverId, orderId);
      setIsTracking(true);
    } catch (err: any) {
      setError(err.message);
      setIsTracking(false);
    }
  }, [driverId, orderId]);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      setError(null);
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      return location;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [autoStart, startTracking, stopTracking]);

  // Subscribe to real-time location updates for this driver
  useEffect(() => {
    const channel = supabase
      .channel('driver-location-updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`
        }, 
        (payload) => {
          if (payload.new) {
            setCurrentLocation({
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              accuracy: payload.new.accuracy,
              speed: payload.new.speed,
              heading: payload.new.heading,
              timestamp: payload.new.timestamp,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return {
    isTracking,
    currentLocation,
    error,
    startTracking,
    stopTracking,
    getCurrentLocation,
  };
}
