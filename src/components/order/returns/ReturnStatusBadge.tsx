import { Badge } from "@/components/ui/badge";
import { RotateCcw, Package, CheckCircle } from "lucide-react";

interface ReturnStatusBadgeProps {
  hasReturns: boolean;
  returnStatus?: string;
  totalItemsReturned?: number;
  className?: string;
}

export function ReturnStatusBadge({ 
  hasReturns, 
  returnStatus, 
  totalItemsReturned = 0, 
  className 
}: ReturnStatusBadgeProps) {
  if (!hasReturns) return null;

  const getStatusInfo = () => {
    switch (returnStatus) {
      case 'pending':
        return {
          icon: RotateCcw,
          text: `${totalItemsReturned} items pending return`,
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200'
        };
      case 'processed':
        return {
          icon: CheckCircle,
          text: `${totalItemsReturned} items returned`,
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          text: `Return completed`,
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
        };
      default:
        return {
          icon: Package,
          text: `${totalItemsReturned} items returned`,
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
        };
    }
  };

  const { icon: Icon, text, variant, className: statusClassName } = getStatusInfo();

  return (
    <Badge 
      variant={variant} 
      className={`flex items-center gap-1 ${statusClassName} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{text}</span>
    </Badge>
  );
}