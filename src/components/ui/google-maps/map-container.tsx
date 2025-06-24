
import React, { useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface MapContainerProps {
  isLoading: boolean;
  error: string | null;
  onMapReady: (mapRef: HTMLDivElement) => void;
}

export function MapContainer({ isLoading, error, onMapReady }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current && !isLoading && !error) {
      onMapReady(mapRef.current);
    }
  }, [isLoading, error, onMapReady]);

  if (isLoading) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center max-w-md p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-2 font-medium">Map Loading Error</p>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-96 w-full rounded-lg" />;
}
