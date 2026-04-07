
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

/** Returns true if the value is only punctuation/symbols (junk placeholder data) */
export const isJunkValue = (val: string | null | undefined): boolean => {
  if (!val) return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  // Matches strings that are only made of *, ., -, _, or whitespace
  return /^[*.\-_\s]+$/.test(trimmed);
};

export const clean = (val: string | null | undefined): string | null => {
  return isJunkValue(val) ? null : val!.trim();
};

/** Cleans a name string by removing literal "null" words and junk values */
export const cleanDisplayName = (val: string | null | undefined): string | null => {
  if (!val) return null;
  // Remove literal "null" / "undefined" words
  const cleaned = val.replace(/\b(null|undefined)\b/gi, '').trim();
  return isJunkValue(cleaned) ? null : cleaned;
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

  // For any business entity type, prioritize company/business name
  if (customer.entity_type === 'business') {
    if (companyName) return companyName;
    if (businessName) return businessName;
  }

  // Individual entity type or non-business — prefer personal name
  if (personalName) {
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
