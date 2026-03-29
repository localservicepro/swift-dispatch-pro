
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

export const getCustomerDisplayName = (customer: Customer): string => {
  // For account customers, prioritize company/business name
  if (customer.customer_type === 'account' && customer.company_name) {
    return customer.company_name;
  }
  
  // For all other types, prioritize personal name first
  if (customer.first_name && customer.last_name) {
    return `${customer.first_name} ${customer.last_name}`;
  }
  
  // Fallback to business name, then company name
  if (customer.business_name) {
    return customer.business_name;
  }
  
  if (customer.company_name) {
    return customer.company_name;
  }
  
  // Final fallback
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
