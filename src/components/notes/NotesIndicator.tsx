
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare, AlertCircle } from "lucide-react";

interface NotesIndicatorProps {
  orderNotes?: string;
  deliveryNotes?: string;
  specialInstructions?: string;
  size?: "sm" | "default";
}

export function NotesIndicator({ 
  orderNotes, 
  deliveryNotes, 
  specialInstructions,
  size = "default"
}: NotesIndicatorProps) {
  const hasNotes = Boolean(orderNotes?.trim() || deliveryNotes?.trim() || specialInstructions?.trim());
  
  if (!hasNotes) return null;

  const iconSize = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  const badgeSize = size === "sm" ? "text-xs px-1" : "text-xs";

  return (
    <div className="flex items-center gap-1">
      {orderNotes?.trim() && (
        <Badge variant="outline" className={`${badgeSize} bg-blue-50 text-blue-700 border-blue-200`}>
          <FileText className={iconSize} />
        </Badge>
      )}
      {deliveryNotes?.trim() && (
        <Badge variant="outline" className={`${badgeSize} bg-green-50 text-green-700 border-green-200`}>
          <MessageSquare className={iconSize} />
        </Badge>
      )}
      {specialInstructions?.trim() && (
        <Badge variant="outline" className={`${badgeSize} bg-orange-50 text-orange-700 border-orange-200`}>
          <AlertCircle className={iconSize} />
        </Badge>
      )}
    </div>
  );
}
