
import { Badge } from "@/components/ui/badge";
import { getCustomerTypeColors, getCustomerTypeLabel } from "@/utils/customerTypeColors";

export function OpportunityCardColorLegend() {
  const customerTypes = ['account', 'trade', 'residential'] as const;

  return (
    <div className="flex items-center gap-4 text-xs text-slate-600">
      <span className="font-medium">Customer Types:</span>
      {customerTypes.map((type) => {
        const colors = getCustomerTypeColors(type);
        const label = getCustomerTypeLabel(type);
        
        return (
          <div key={type} className="flex items-center gap-1">
            <div 
              className={`w-3 h-3 rounded border ${colors.card} ${colors.border}`}
            />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
