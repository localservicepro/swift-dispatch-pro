
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

export const getCustomerDisplayName = (customer: Customer): string => {
  const personalName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  // For account customers, prioritize company name
  if (customer.customer_type === 'account' && customer.company_name) {
    return customer.company_name;
  }

  // Individual customers should always show their personal name first
  if (customer.entity_type === 'individual' && personalName) {
    return personalName;
  }

  // For all other non-account customers, still prefer a personal name when available
  if (personalName) {
    return personalName;
  }

  // Fallback to business/company names
  if (customer.business_name) {
    return customer.business_name;
  }

  if (customer.company_name) {
    return customer.company_name;
  }

  return 'Customer';
};

export const getCustomerContactInfo = (customer: Customer): string => {
  if (customer.first_name && customer.last_name) {
    return `${customer.first_name} ${customer.last_name}`;
  }
  
  if (customer.email) {
    return customer.email;
  }
  
  return 'No contact details';
};

export const formatCustomerForOrder = (customer: Customer) => {
  return {
    customer_name: getCustomerDisplayName(customer),
    customer_phone: customer.phone || '',
    customer_address: customer.full_address,
    customer_id: customer.id
  };
};

export const serializeCartItemsWithFormatting = (cart: any[]) => {
  return cart.map(item => ({
    id: item.product.id,
    name: item.product.name,
    price: item.unit_price,
    quantity: item.quantity,
    total_price: item.unit_price * item.quantity
  }));
};
