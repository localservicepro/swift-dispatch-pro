
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: 'admin' | 'driver';
}

export function DriverAssignmentDebug() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      console.log('DriverAssignmentDebug: Loading drivers...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'driver');

      console.log('DriverAssignmentDebug: Driver query result:', { data, error });
      
      if (error) throw error;
      
      setDrivers(data || []);
    } catch (error) {
      console.error('DriverAssignmentDebug: Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-orange-700">
            Driver Assignment Debug
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadDrivers}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="space-y-2">
          <p><strong>Available Drivers for Assignment:</strong> {drivers.length}</p>
          {drivers.length > 0 ? (
            <ul className="ml-4 space-y-1">
              {drivers.map(driver => (
                <li key={driver.id} className="text-orange-800">
                  • {driver.full_name || 'No name'} ({driver.email})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-orange-800">No drivers found in database with role='driver'</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}