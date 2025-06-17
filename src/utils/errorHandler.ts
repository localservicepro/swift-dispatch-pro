
import { toast } from "@/hooks/use-toast";

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
      userMessage = 'Invalid product data format. Please check your product information and try again.';
    } else if (originalError.message.includes('invalid input syntax for type uuid')) {
      userMessage = 'Invalid ID format detected. Please refresh the page and try again.';
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
    } else if (originalError.message.includes('is required')) {
      userMessage = originalError.message; // Use validation message as-is
    } else if (originalError.message.includes('Invalid UUID format')) {
      userMessage = 'Invalid data format. Please refresh the page and try again.';
    } else if (originalError.message.includes('At least one product is required')) {
      userMessage = 'Please add at least one product to your order.';
    } else if (originalError.message.includes('validation') || originalError.message.includes('invalid')) {
      userMessage = originalError.message; // Use validation messages directly
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

// New function specifically for order creation errors
export const handleOrderCreationError = (error: any) => {
  console.error('Order creation error:', error);
  
  let userMessage = 'Failed to create order';
  
  if (error?.message) {
    if (error.message.includes('is required')) {
      userMessage = error.message;
    } else if (error.message.includes('invalid input syntax for type uuid')) {
      userMessage = 'Invalid customer or product information. Please refresh and try again.';
    } else if (error.message.includes('invalid input syntax for type json')) {
      userMessage = 'Invalid product data. Please check your product selection and try again.';
    } else if (error.message.includes('validation')) {
      userMessage = error.message;
    } else if (error.message.includes('Foreign key violation')) {
      userMessage = 'Invalid customer or product reference. Please refresh and try again.';
    } else if (error.message.includes('duplicate key')) {
      userMessage = 'An order with this information already exists.';
    } else {
      userMessage = error.message;
    }
  }

  toast({
    title: "Order Creation Failed",
    description: userMessage,
    variant: "destructive",
  });

  return userMessage;
};
