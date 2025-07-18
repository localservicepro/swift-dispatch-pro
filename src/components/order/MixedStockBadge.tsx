import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface MixedStockBadgeProps {
  className?: string;
  size?: "sm" | "default";
}

export function MixedStockBadge({ className = "", size = "default" }: MixedStockBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`text-amber-700 border-amber-300 bg-amber-50 ${className}`}
    >
      <AlertTriangle className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} mr-1`} />
      Mixed Stock
    </Badge>
  );
}