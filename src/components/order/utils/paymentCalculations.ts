
interface PaymentSettings {
  gst_rate: number;
  service_charge_rate: number;
  currency: string;
  gst_label: string;
  include_gst_in_prices: boolean;
  gst_enabled: boolean;
}

export function calculateGST(amount: number, gstRate: number): number {
  return (amount * gstRate) / 100;
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
  settings: PaymentSettings
) {
  console.log('Calculating order totals:', {
    subtotal,
    adjustments,
    deliveryFee,
    paymentMethod,
    settings
  });

  // Base amount before taxes and surcharges
  const baseAmount = subtotal + adjustments + deliveryFee;
  
  // Calculate surcharge if applicable
  const hasSurcharge = getPaymentMethodSurcharge(paymentMethod);
  const surchargeAmount = hasSurcharge ? calculateSurcharge(baseAmount, settings.service_charge_rate) : 0;
  
  // Amount after surcharge, before GST
  const amountAfterSurcharge = baseAmount + surchargeAmount;
  
  // Calculate GST on the total amount including surcharge (only if GST is enabled)
  const gstAmount = settings.gst_enabled ? calculateGST(amountAfterSurcharge, settings.gst_rate) : 0;
  
  // Final total
  const totalAmount = amountAfterSurcharge + gstAmount;

  const result = {
    subtotal,
    adjustments,
    deliveryFee,
    surchargeAmount,
    gstAmount,
    totalAmount,
    baseAmount,
    hasSurcharge,
    surchargeRate: settings.service_charge_rate,
    gstRate: settings.gst_rate
  };

  console.log('Calculation result:', result);
  return result;
}

export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return `AU$${amount.toFixed(2)}`;
}
