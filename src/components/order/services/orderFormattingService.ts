
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

/** Returns true if the value is only punctuation/symbols (junk placeholder data) */
const isJunkValue = (val: string | null | undefined): boolean => {
  if (!val) return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  // Matches strings that are only made of *, ., -, _, or whitespace
  return /^[*.\-_\s]+$/.test(trimmed);
};

const clean = (val: string | null | undefined): string | null => {
  return isJunkValue(val) ? null : val!.trim();
};

export const getCustomerDisplayName = (customer: Customer): string => {
  const firstName = clean(customer.first_name);
  const lastName = clean(customer.last_name);
  const companyName = clean(customer.company_name);
  const businessName = clean(customer.business_name);

  const personalName = [firstName, lastName].filter(Boolean).join(' ').trim();

  // For account customers, prioritize company name
  if (customer.customer_type === 'account' && companyName) {
    return companyName;
  }

  // Non-account customers (residential, trade) — always prefer personal name
  if (customer.customer_type !== 'account' && personalName) {
    return personalName;
  }

  // Individual entity type — prefer personal name
  if (customer.entity_type === 'individual' && personalName) {
    return personalName;
  }

  // General fallback: personal name first
  if (personalName) {
    return personalName;
  }

  // Fallback to business/company names
  if (businessName) {
    return businessName;
  }

  if (companyName) {
    return companyName;
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
