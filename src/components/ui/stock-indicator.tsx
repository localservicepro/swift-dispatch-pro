import { Badge } from "@/components/ui/badge";

interface StockIndicatorProps {
  stockQuantity: number;
  className?: string;
  showLabel?: boolean;
}

export function StockIndicator({ stockQuantity, className = "", showLabel = true }: StockIndicatorProps) {
  const getStockStatus = () => {
    if (stockQuantity > 10) {
      return { 
        color: "bg-green-100 text-green-800 border-green-200", 
        label: showLabel ? `In Stock (${stockQuantity})` : `${stockQuantity}`,
        icon: "●"
      };
    } else if (stockQuantity > 0) {
      return { 
        color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
        label: showLabel ? `Low Stock (${stockQuantity})` : `${stockQuantity}`,
        icon: "●"
      };
    } else if (stockQuantity === 0) {
      return { 
        color: "bg-red-100 text-red-800 border-red-200", 
        label: showLabel ? "Out of Stock" : "0",
        icon: "●"
      };
    } else {
      return { 
        color: "bg-orange-100 text-orange-800 border-orange-200", 
        label: showLabel ? `Backorder (${Math.abs(stockQuantity)})` : `${stockQuantity}`,
        icon: "◐"
      };
    }
  };

  const status = getStockStatus();

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-medium ${status.color} ${className}`}
    >
      <span className="mr-1">{status.icon}</span>
      {status.label}
    </Badge>
  );
}