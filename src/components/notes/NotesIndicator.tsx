
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare } from "lucide-react";

interface NotesIndicatorProps {
  orderNotes?: string;
  deliveryNotes?: string;
  size?: "sm" | "default";
  userRole?: 'admin' | 'driver' | 'customer';
}

export function NotesIndicator({ 
  orderNotes, 
  deliveryNotes,
  size = "default",
  userRole = "admin"
}: NotesIndicatorProps) {
  // Filter notes based on user role
  const visibleOrderNotes = userRole === 'admin' ? orderNotes : '';
  const visibleDeliveryNotes = (userRole === 'admin' || userRole === 'driver') ? deliveryNotes : '';
  
  const hasNotes = Boolean(visibleOrderNotes?.trim() || visibleDeliveryNotes?.trim());
  
  if (!hasNotes) return null;

  const iconSize = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  const badgeSize = size === "sm" ? "text-xs px-1" : "text-xs";

  return (
    <div className="flex items-center gap-1">
      {visibleOrderNotes?.trim() && (
        <Badge variant="outline" className={`${badgeSize} bg-blue-50 text-blue-700 border-blue-200`}>
          <FileText className={iconSize} />
        </Badge>
      )}
      {visibleDeliveryNotes?.trim() && (
        <Badge variant="outline" className={`${badgeSize} bg-green-50 text-green-700 border-green-200`}>
          <MessageSquare className={iconSize} />
        </Badge>
      )}
    </div>
  );
}
