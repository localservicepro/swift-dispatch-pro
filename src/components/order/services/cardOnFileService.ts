
import { supabase } from "@/integrations/supabase/client";

interface ChargeCardOnFileParams {
  customerId: string;
  amount: number;
  currency?: string;
  orderNumber: string;
  description?: string;
}

export async function chargeCardOnFile({
  customerId,
  amount,
  currency = 'USD',
  orderNumber,
  description
}: ChargeCardOnFileParams) {
  try {
    const { data, error } = await supabase.functions.invoke('charge-saved-card', {
      body: {
        customerId,
        amount,
        currency,
        orderNumber,
        description
      }
    });

    if (error) {
      throw error;
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      paymentIntentId: data.payment_intent_id,
      status: data.status
    };
  } catch (error: any) {
    console.error('Error charging card on file:', error);
    throw new Error(error.message || 'Failed to charge saved card');
  }
}

export async function setupPaymentMethod(customerId: string, returnUrl: string) {
  try {
    const { data, error } = await supabase.functions.invoke('setup-payment-method', {
      body: {
        customerId,
        returnUrl
      }
    });

    if (error) {
      throw error;
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      clientSecret: data.clientSecret,
      stripeCustomerId: data.stripeCustomerId
    };
  } catch (error: any) {
    console.error('Error setting up payment method:', error);
    throw new Error(error.message || 'Failed to setup payment method');
  }
}

export async function savePaymentMethod(customerId: string, paymentMethodId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('save-payment-method', {
      body: {
        customerId,
        paymentMethodId
      }
    });

    if (error) {
      throw error;
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving payment method:', error);
    throw new Error(error.message || 'Failed to save payment method');
  }
}
