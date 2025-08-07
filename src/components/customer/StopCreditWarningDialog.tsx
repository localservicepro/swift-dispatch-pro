import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface StopCreditWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  customerName: string;
}

export function StopCreditWarningDialog({ 
  isOpen, 
  onClose, 
  onContinue, 
  customerName 
}: StopCreditWarningDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="border-red-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Stop Credit Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="text-red-600">
            <strong>{customerName}</strong> is flagged as "Stop Credit". This customer may have 
            overdue payments or credit issues. Please review their account before proceeding 
            with this order.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel Order
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onContinue}
            className="bg-red-600 hover:bg-red-700"
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}