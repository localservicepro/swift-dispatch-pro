
export const formatCardBrand = (brand: string) => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

export const getAvailablePaymentMethods = (isAccountCustomer: boolean, hasCardOnFile: boolean) => {
  return PAYMENT_METHODS.map(method => ({
    ...method,
    available: method.id === 'account' ? isAccountCustomer : 
               method.id === 'card_on_file' ? hasCardOnFile : 
               true
  }));
};

import { PAYMENT_METHODS } from "../constants/paymentMethods";
