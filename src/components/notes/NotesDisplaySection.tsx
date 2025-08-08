
import { useState } from "react";
import { FileText, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NotesDisplaySectionProps {
  orderNotes?: string;
  deliveryNotes?: string;
  compact?: boolean;
  onEditClick?: () => void;
  userRole?: 'admin' | 'driver' | 'customer';
}

export function NotesDisplaySection({
  orderNotes,
  deliveryNotes,
  compact = false,
  onEditClick,
  userRole = 'admin'
}: NotesDisplaySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter notes based on user role
  const visibleOrderNotes = userRole === 'admin' ? orderNotes : '';
  const visibleDeliveryNotes = (userRole === 'admin' || userRole === 'driver') ? deliveryNotes : '';
  
  const hasNotes = Boolean(visibleOrderNotes?.trim() || visibleDeliveryNotes?.trim());
  
  if (!hasNotes) return null;

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const NotesContent = () => (
    <div className="space-y-2">
      {/* Order Notes - Admin only */}
      {orderNotes?.trim() && userRole === 'admin' && (
        <div className="flex items-start gap-2 text-xs">
          <FileText className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-blue-700">Order Notes (Admin Only):</span>
            <p className="text-slate-600 mt-1">{compact && !isExpanded ? truncateText(orderNotes) : orderNotes}</p>
          </div>
        </div>
      )}
      
      {/* Delivery Notes - Visible to drivers and admins */}
      {deliveryNotes?.trim() && (userRole === 'admin' || userRole === 'driver') && (
        <div className="flex items-start gap-2 text-xs">
          <MessageSquare className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-green-700">Delivery Notes:</span>
            <p className="text-slate-600 mt-1">{compact && !isExpanded ? truncateText(deliveryNotes) : deliveryNotes}</p>
          </div>
        </div>
      )}
      
    </div>
  );

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-slate-600 hover:text-slate-800">
                <span className="flex items-center gap-1">
                  Notes
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
              </Button>
            </CollapsibleTrigger>
            {onEditClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick();
                }}
                className="h-auto p-1 text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </Button>
            )}
          </div>
          
          <CollapsibleContent className="mt-2">
            <NotesContent />
          </CollapsibleContent>
          
          {!isExpanded && (
            <div className="mt-1">
              <NotesContent />
            </div>
          )}
        </div>
      </Collapsible>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-800">Notes</h4>
        {onEditClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            className="h-auto p-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Edit
          </Button>
        )}
      </div>
      <NotesContent />
    </div>
  );
}
