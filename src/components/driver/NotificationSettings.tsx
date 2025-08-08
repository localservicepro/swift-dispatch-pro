import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Smartphone, Check, X } from "lucide-react";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const { permission, isSupported, requestPermission, canNotify } = useNotificationPermission();
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    const success = await requestPermission();
    setIsRequesting(false);
    
    if (success) {
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive browser notifications for new orders",
      });
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="secondary" className="gap-1"><X className="w-3 h-3" />Not Supported</Badge>;
    }
    if (permission === 'granted') {
      return <Badge variant="default" className="gap-1"><Check className="w-3 h-3" />Enabled</Badge>;
    }
    if (permission === 'denied') {
      return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" />Blocked</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Bell className="w-3 h-3" />Not Set</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Browser Notifications</p>
            <p className="text-xs text-muted-foreground">
              Get alerts for new order assignments
            </p>
          </div>
          {getStatusBadge()}
        </div>
        
        {isSupported && permission !== 'granted' && permission !== 'denied' && (
          <Button 
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            size="sm"
            className="w-full"
          >
            {isRequesting ? "Requesting..." : "Enable Notifications"}
          </Button>
        )}
        
        {permission === 'denied' && (
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">Notifications are blocked</p>
            <p>To enable notifications:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Change notifications to "Allow"</li>
              <li>Refresh this page</li>
            </ul>
          </div>
        )}
        
        {!isSupported && (
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4" />
              <p className="font-medium">Mobile Device Detected</p>
            </div>
            <p>For the best notification experience on mobile:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Add this app to your home screen</li>
              <li>Use the "Add to Home Screen" option in your browser</li>
              <li>Open the app from your home screen</li>
            </ul>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-1">
            <p className="text-sm font-medium">Real-time Updates</p>
            <p className="text-xs text-muted-foreground">
              Toast notifications (always enabled)
            </p>
          </div>
          <Badge variant="default" className="gap-1">
            <Check className="w-3 h-3" />Enabled
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}