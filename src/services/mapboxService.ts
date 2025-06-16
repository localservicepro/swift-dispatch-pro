
import { supabase } from "@/integrations/supabase/client";

// Note: You'll need to add your Mapbox public token to Supabase Edge Function Secrets
const MAPBOX_PUBLIC_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'; // Temporary token - replace with your own

export interface RouteOptions {
  coordinates: [number, number][]; // [longitude, latitude] pairs
  profile?: 'driving' | 'walking' | 'cycling';
  optimize?: boolean;
  geometries?: 'geojson' | 'polyline' | 'polyline6';
}

export interface RouteResponse {
  routes: Array<{
    geometry: any;
    duration: number;
    distance: number;
    legs: Array<{
      duration: number;
      distance: number;
      steps: Array<{
        instruction: string;
        distance: number;
        duration: number;
        geometry: any;
      }>;
    }>;
  }>;
  waypoints: Array<{
    location: [number, number];
    name: string;
  }>;
}

export class MapboxService {
  private baseUrl = 'https://api.mapbox.com';

  async getRoute(options: RouteOptions): Promise<RouteResponse> {
    const { coordinates, profile = 'driving', optimize = false, geometries = 'geojson' } = options;
    
    if (coordinates.length < 2) {
      throw new Error('At least 2 coordinates are required for routing');
    }

    const coordinatesString = coordinates.map(coord => coord.join(',')).join(';');
    const endpoint = optimize ? 'optimized-trips/v1' : 'directions/v5';
    
    const url = `${this.baseUrl}/${endpoint}/mapbox/${profile}/${coordinatesString}`;
    
    const params = new URLSearchParams({
      access_token: MAPBOX_PUBLIC_TOKEN,
      geometries,
      overview: 'full',
      steps: 'true',
      ...(optimize && { roundtrip: 'false' }),
    });

    try {
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get route from Mapbox:', error);
      throw error;
    }
  }

  async saveRouteToDatabase(orderId: string, driverId: string, routeData: RouteResponse): Promise<void> {
    try {
      const { error } = await supabase.from('delivery_routes').insert({
        order_id: orderId,
        driver_id: driverId,
        route_data: routeData,
        waypoints: routeData.waypoints,
        estimated_duration: routeData.routes[0]?.duration,
        estimated_distance: routeData.routes[0]?.distance,
        status: 'planned',
      });

      if (error) {
        console.error('Error saving route:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save route to database:', error);
      throw error;
    }
  }

  async updateRouteStatus(orderId: string, status: 'planned' | 'active' | 'completed' | 'cancelled'): Promise<void> {
    try {
      const { error } = await supabase
        .from('delivery_routes')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) {
        console.error('Error updating route status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update route status:', error);
      throw error;
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }
}

export const mapboxService = new MapboxService();
