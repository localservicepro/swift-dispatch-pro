
import { toast } from "@/components/ui/use-toast";

interface ErrorDetails {
  operation: string;
  orderId?: string;
  orderNumber?: string;
  originalError: any;
}

export const handleOrderError = (details: ErrorDetails) => {
  const { operation, orderId, orderNumber, originalError } = details;
  
  console.error(`${operation} failed:`, {
    orderId,
    orderNumber,
    error: originalError
  });

  // Determine user-friendly error message
  let userMessage = `Failed to ${operation.toLowerCase()}`;
  
  if (originalError?.message) {
    // Check for common database errors
    if (originalError.message.includes('invalid input syntax for type json')) {
      userMessage = 'Invalid data format. Please try again.';
    } else if (originalError.message.includes('violates check constraint')) {
      userMessage = 'Invalid order status. Please select a valid status.';
    } else if (originalError.message.includes('permission denied')) {
      userMessage = 'You do not have permission to perform this action.';
    } else {
      userMessage = originalError.message;
    }
  }

  // Show user-friendly toast
  toast({
    title: "Error",
    description: userMessage,
    variant: "destructive",
  });

  return {
    userMessage,
    technicalError: originalError
  };
};
