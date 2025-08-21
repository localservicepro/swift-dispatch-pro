export interface CustomerAddressCompletenessResult {
  isComplete: boolean;
  missingFields: string[];
  message: string;
}

export function checkCustomerAddressCompleteness(customer: any): CustomerAddressCompletenessResult {
  const missingFields: string[] = [];
  
  if (!customer.full_address || customer.full_address.trim() === '') {
    missingFields.push('address');
  }
  
  if (!customer.suburb_id) {
    missingFields.push('suburb');
  }
  
  const isComplete = missingFields.length === 0;
  
  let message = '';
  if (!isComplete) {
    if (missingFields.includes('address')) {
      message = 'Customer address is incomplete and will need to be entered during order creation.';
    } else if (missingFields.includes('suburb')) {
      message = 'Customer suburb information is missing.';
    }
  } else {
    message = 'Customer address is complete and ready for orders.';
  }
  
  return {
    isComplete,
    missingFields,
    message
  };
}

export function getCustomerAddressWarning(customer: any): string | null {
  const completeness = checkCustomerAddressCompleteness(customer);
  return completeness.isComplete ? null : completeness.message;
}