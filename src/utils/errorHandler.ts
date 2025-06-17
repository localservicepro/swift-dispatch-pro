
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
    error: originalError,
    errorMessage: originalError?.message,
    errorCode: originalError?.code
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
    } else if (originalError.message.includes('Invalid order status')) {
      userMessage = 'Invalid order status provided. Please contact support.';
    } else if (originalError.message.includes('Failed to fetch order')) {
      userMessage = 'Could not find the order. It may have been deleted.';
    } else if (originalError.message.includes('network') || originalError.message.includes('fetch')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else {
      // Use the original error message if it's user-friendly
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
