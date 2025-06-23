
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { placeId, sessionToken } = await req.json();

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Place ID parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call Google Places Details API
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', googleMapsApiKey);
    url.searchParams.append('fields', 'formatted_address,address_components,geometry,name');
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

    console.log('Calling Google Places Details API for place ID:', placeId);

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log('Google Places Details API response status:', data.status);

    if (data.result) {
      // Parse address components into structured format
      const addressComponents = data.result.address_components || [];
      const geometry = data.result.geometry || {};
      
      const parsedAddress = {
        fullAddress: data.result.formatted_address,
        name: data.result.name || '',
        street: '',
        streetNumber: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
        lat: geometry.location?.lat || null,
        lng: geometry.location?.lng || null,
        viewport: geometry.viewport || null
      };

      // Parse address components
      addressComponents.forEach((component: any) => {
        const types = component.types || [];
        
        if (types.includes('street_number')) {
          parsedAddress.streetNumber = component.long_name;
        } else if (types.includes('route')) {
          parsedAddress.street = component.long_name;
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

      // Combine street number and street name
      if (parsedAddress.streetNumber && parsedAddress.street) {
        parsedAddress.street = `${parsedAddress.streetNumber} ${parsedAddress.street}`;
      }

      return new Response(JSON.stringify({
        ...data,
        parsedAddress
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-places-details function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
