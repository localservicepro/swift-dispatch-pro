
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AddressData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  lat: number;
  lng: number;
  name?: string;
}

export function useGoogleMaps() {
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const initializeMap = useCallback((mapElement: HTMLDivElement, initialAddress?: string) => {
    try {
      console.log('useGoogleMaps: Initializing Google Maps...');
      
      if (!window.google) {
        throw new Error('Google Maps API not loaded');
      }

      if (!window.google.maps) {
        throw new Error('Google Maps JavaScript API not available');
      }

      // Clear any existing map
      if (mapInstanceRef.current) {
        console.log('useGoogleMaps: Cleaning up existing map instance');
        cleanup();
      }

      const map = new window.google.maps.Map(mapElement, {
        center: { lat: -33.8688, lng: 151.2093 }, // Default to Sydney
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;
      console.log('useGoogleMaps: Map instance created successfully');

      // Add click listener to map
      map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        console.log('useGoogleMaps: Map clicked at:', lat, lng);
        reverseGeocode(lat, lng);
      });

      // If there's an initial address, try to geocode it
      if (initialAddress && initialAddress.trim()) {
        console.log('useGoogleMaps: Geocoding initial address:', initialAddress);
        setTimeout(() => geocodeAddress(initialAddress), 500); // Small delay to ensure map is ready
      }

      console.log('useGoogleMaps: Google Maps initialized successfully');
      return map;
    } catch (error) {
      console.error('useGoogleMaps: Error initializing map:', error);
      throw new Error(`Failed to initialize map: ${error.message}. Please ensure Google Maps API is loaded and all required APIs are enabled.`);
    }
  }, []);

  const geocodeAddress = async (address: string) => {
    if (!window.google || !window.google.maps) {
      console.error('useGoogleMaps: Google Maps API not available for geocoding');
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      console.log('useGoogleMaps: Geocoding address:', address);
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(new Error(`Geocoding failed: ${status}`));
        });
      });

      const result = (response as any)[0];
      if (result) {
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        console.log('useGoogleMaps: Geocoding successful, updating map location');
        updateMapLocation(lat, lng);
        return await reverseGeocode(lat, lng);
      }
    } catch (error) {
      console.error('useGoogleMaps: Geocoding failed:', error);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<AddressData | null> => {
    if (!window.google || !window.google.maps) {
      console.error('useGoogleMaps: Google Maps API not available for reverse geocoding');
      return null;
    }

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      console.log('useGoogleMaps: Reverse geocoding:', lat, lng);
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(new Error(`Reverse geocoding failed: ${status}`));
        });
      });

      const result = (response as any)[0];
      if (result) {
        const addressData: AddressData = {
          fullAddress: result.formatted_address,
          street: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
          lat,
          lng
        };

        // Parse address components
        result.address_components.forEach((component: any) => {
          const types = component.types;
          
          if (types.includes('street_number') || types.includes('route')) {
            addressData.street += (addressData.street ? ' ' : '') + component.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
            addressData.city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            addressData.state = component.short_name;
          } else if (types.includes('postal_code')) {
            addressData.postcode = component.long_name;
          } else if (types.includes('country')) {
            addressData.country = component.long_name;
          }
        });

        updateMapLocation(lat, lng);
        console.log('useGoogleMaps: Reverse geocoding successful:', addressData);
        return addressData;
      }
    } catch (error) {
      console.error('useGoogleMaps: Reverse geocoding failed:', error);
    }
    return null;
  };

  const updateMapLocation = (lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.google) {
      console.warn('useGoogleMaps: Cannot update map location - map not initialized');
      return;
    }

    const position = { lat, lng };
    
    try {
      // Update map center
      mapInstanceRef.current.setCenter(position);
      mapInstanceRef.current.setZoom(16);

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      // Add new marker
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Selected Location'
      });

      // Add drag listener to marker
      markerRef.current.addListener('dragend', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        console.log('useGoogleMaps: Marker dragged to:', lat, lng);
        reverseGeocode(lat, lng);
      });

      console.log('useGoogleMaps: Map location updated successfully');
    } catch (error) {
      console.error('useGoogleMaps: Error updating map location:', error);
    }
  };

  const searchAddresses = async (query: string) => {
    try {
      console.log('useGoogleMaps: Searching for addresses via edge function:', query);
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { input: query }
      });

      if (error) {
        console.error('useGoogleMaps: Address search error:', error);
        // Fallback to client-side search if edge function fails
        return await clientSideSearch(query);
      }

      console.log('useGoogleMaps: Address search response:', data);
      return data?.predictions || [];
    } catch (error) {
      console.error('useGoogleMaps: Error searching addresses:', error);
      // Fallback to client-side search
      return await clientSideSearch(query);
    }
  };

  const clientSideSearch = async (query: string) => {
    if (!window.google?.maps?.places?.AutocompleteService) {
      console.error('useGoogleMaps: Google Places AutocompleteService not available');
      return [];
    }

    try {
      console.log('useGoogleMaps: Using client-side search for:', query);
      const service = new window.google.maps.places.AutocompleteService();
      const response = await new Promise((resolve, reject) => {
        service.getPlacePredictions(
          {
            input: query,
            types: ['address'],
            componentRestrictions: { country: 'au' }
          },
          (predictions: any, status: any) => {
            if (status === 'OK') resolve(predictions || []);
            else reject(new Error(`Places search failed: ${status}`));
          }
        );
      });

      console.log('useGoogleMaps: Client-side search successful');
      return response as any[];
    } catch (error) {
      console.error('useGoogleMaps: Client-side places search failed:', error);
      return [];
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      console.log('useGoogleMaps: Getting details for place:', placeId);
      const { data, error } = await supabase.functions.invoke('google-places-details', {
        body: { placeId }
      });

      if (error) {
        console.error('useGoogleMaps: Place details error:', error);
        // Fallback to client-side details
        return await clientSideDetails(placeId);
      }

      console.log('useGoogleMaps: Place details response:', data);
      return data?.parsedAddress;
    } catch (error) {
      console.error('useGoogleMaps: Error getting place details:', error);
      // Fallback to client-side details
      return await clientSideDetails(placeId);
    }
  };

  const clientSideDetails = async (placeId: string) => {
    if (!window.google?.maps?.places?.PlacesService) {
      console.error('useGoogleMaps: Google Places PlacesService not available');
      return null;
    }

    try {
      console.log('useGoogleMaps: Using client-side details for place:', placeId);
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
      
      const response = await new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'address_components', 'geometry', 'name']
          },
          (place: any, status: any) => {
            if (status === 'OK') resolve(place);
            else reject(new Error(`Place details failed: ${status}`));
          }
        );
      });

      const place = response as any;
      if (place) {
        const addressComponents = place.address_components || [];
        const geometry = place.geometry || {};
        
        const parsedAddress = {
          fullAddress: place.formatted_address,
          name: place.name || '',
          street: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
          lat: geometry.location?.lat() || null,
          lng: geometry.location?.lng() || null,
        };

        // Parse address components
        addressComponents.forEach((component: any) => {
          const types = component.types || [];
          
          if (types.includes('street_number') || types.includes('route')) {
            parsedAddress.street += (parsedAddress.street ? ' ' : '') + component.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
            parsedAddress.city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            parsedAddress.state = component.short_name;
          } else if (types.includes('postal_code')) {
            parsedAddress.postcode = component.long_name;
          } else if (types.includes('country')) {
            parsedAddress.country = component.long_name;
          }
        });

        console.log('useGoogleMaps: Client-side place details successful');
        return parsedAddress;
      }
    } catch (error) {
      console.error('useGoogleMaps: Client-side place details failed:', error);
    }
    return null;
  };

  const cleanup = () => {
    console.log('useGoogleMaps: Cleaning up map resources');
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    mapInstanceRef.current = null;
  };

  return {
    initializeMap,
    geocodeAddress,
    reverseGeocode,
    updateMapLocation,
    searchAddresses,
    getPlaceDetails,
    cleanup
  };
}
