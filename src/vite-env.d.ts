
/// <reference types="vite/client" />

declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        Size: any;
        Geocoder: any;
        places?: {
          AutocompleteService: any;
          PlacesService: any;
        };
      };
    };
    initGoogleMaps?: () => void;
  }

  namespace google {
    namespace maps {
      class Map {
        constructor(mapDiv: HTMLElement, opts?: any);
        addListener(eventName: string, handler: Function): void;
        setCenter(latLng: any): void;
        setZoom(zoom: number): void;
      }
      
      class Marker {
        constructor(opts: any);
        setMap(map: Map | null): void;
        addListener(eventName: string, handler: Function): void;
      }
      
      class Size {
        constructor(width: number, height: number);
      }
      
      class Geocoder {
        geocode(request: any, callback: (results: any[], status: string) => void): void;
      }
      
      interface GeocoderResult {
        geometry: {
          location: {
            lat(): number;
            lng(): number;
          };
        };
        formatted_address: string;
        address_components: any[];
      }
    }
  }
}

export {};
