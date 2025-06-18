
import { supabase } from "@/integrations/supabase/client";

interface PaymentSettings {
  gst_rate: number;
  service_charge_rate: number;
  gst_label: string;
  include_gst_in_prices: boolean;
  currency: string;
  default_delivery_fee: number;
}

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching payment settings:', error);
  }

  // Return default values if no settings exist
  return data || {
    gst_rate: 10.00,
    service_charge_rate: 2.50,
    gst_label: 'GST',
    include_gst_in_prices: true,
    currency: 'AUD',
    default_delivery_fee: 0.00
  };
};

export const calculateOrderTotals = async (
  subtotal: number, 
  adjustments: number, 
  deliveryFee: number, 
  paymentMethod: string
) => {
  const settings = await getPaymentSettings();
  
  const baseTotal = subtotal + adjustments + deliveryFee;
  const gstAmount = (baseTotal * settings.gst_rate) / 100;
  
  // Apply surcharge for credit card payments
  const surchargeAmount = (paymentMethod === 'card_on_file' || paymentMethod === 'credit_card' || 
                          paymentMethod === '7_day_invoice' || paymentMethod === 'in_yard_card') 
    ? (baseTotal * settings.service_charge_rate) / 100 
    : 0;
  
  const totalAmount = baseTotal + gstAmount + surchargeAmount;
  
  return {
    baseTotal,
    gstAmount,
    surchargeAmount,
    totalAmount,
    settings
  };
};
