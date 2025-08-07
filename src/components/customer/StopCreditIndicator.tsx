import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StopCreditIndicatorProps {
  className?: string;
}

export function StopCreditIndicator({ className = "" }: StopCreditIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center ${className}`}>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Stop Credit - Customer flagged</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}