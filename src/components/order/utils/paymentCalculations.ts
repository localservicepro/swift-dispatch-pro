
interface PaymentSettings {
  gst_rate: number;
  service_charge_rate: number;
  currency: string;
  gst_label: string;
  include_gst_in_prices: boolean;
  gst_enabled: boolean;
  fuel_surcharge?: number;
}

export function calculateGST(amount: number, gstRate: number): number {
  return (amount * gstRate) / 100;
}

export function calculateIncludedGST(amount: number, gstRate: number): number {
  // Calculate GST that's already included in the price
  return (amount / (1 + gstRate / 100)) * (gstRate / 100);
}

export function calculateSurcharge(amount: number, surchargeRate: number): number {
  return (amount * surchargeRate) / 100;
}

export function getPaymentMethodSurcharge(paymentMethod: string): boolean {
  const surchargePaymentMethods = [
    'card_on_file',
    '7_day_invoice', 
    'in_yard_card',
    'account_card'
  ];
  
  return surchargePaymentMethods.includes(paymentMethod);
}

export function calculateOrderTotals(
  subtotal: number,
  adjustments: number,
  deliveryFee: number,
  paymentMethod: string,
  settings: PaymentSettings,
  deliveryMethod: string = 'delivery',
  splitCount: number = 1
) {



  // Fuel surcharge: only for delivery orders, applied per split
  const fuelSurchargePerUnit = settings.fuel_surcharge || 0;
  const fuelSurcharge = deliveryMethod === 'delivery' ? fuelSurchargePerUnit * splitCount : 0;

  // Base amount before surcharges (fuel surcharge is added on top of delivery fee)
  const baseAmount = subtotal + adjustments + deliveryFee + fuelSurcharge;
  
  // Calculate surcharge if applicable
  const hasSurcharge = getPaymentMethodSurcharge(paymentMethod);
  const surchargeAmount = hasSurcharge ? calculateSurcharge(baseAmount, settings.service_charge_rate) : 0;
  
  // Final total
  const totalAmount = baseAmount + surchargeAmount;
  
  // Calculate GST that's already included in the subtotal for display purposes only
  const gstAmount = settings.gst_enabled && settings.include_gst_in_prices 
    ? calculateIncludedGST(subtotal, settings.gst_rate) 
    : 0;

  const result = {
    subtotal,
    adjustments,
    deliveryFee,
    fuelSurcharge,
    fuelSurchargePerUnit,
    splitCount,
    surchargeAmount,
    gstAmount,
    totalAmount,
    baseAmount,
    hasSurcharge,
    surchargeRate: settings.service_charge_rate,
    gstRate: settings.gst_rate,
    gstIncluded: settings.include_gst_in_prices
  };

  return result;

}

export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return `AU$${amount.toFixed(2)}`;
}
