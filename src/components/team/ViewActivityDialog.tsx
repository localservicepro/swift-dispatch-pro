
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Activity, Calendar } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}

interface ViewActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: Profile | null;
}

export function ViewActivityDialog({ open, onOpenChange, admin }: ViewActivityDialogProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && admin) {
      fetchAdminActivity();
    }
  }, [open, admin]);

  const fetchAdminActivity = async () => {
    if (!admin) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('admin_id', admin.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching admin activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800';
      case 'view':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Activity Log - {admin?.full_name || 'Admin'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading activity...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activity Found</h3>
              <p className="text-gray-500">
                No recent activity has been logged for this admin.
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <Card key={activity.id} className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionTypeColor(activity.action_type)}>
                        {activity.action_type}
                      </Badge>
                      <span className="font-medium text-sm">
                        {activity.target_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {activity.description && (
                    <p className="text-sm text-gray-700 mb-3">
                      {activity.description}
                    </p>
                  )}
                  
                  {activity.target_details && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600 mb-1">Target Details:</p>
                      <pre className="text-xs text-gray-800 overflow-x-auto">
                        {JSON.stringify(activity.target_details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
