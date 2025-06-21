
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
    console.log('Charging card on file for customer:', customerId);
    
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
      console.error('Supabase function invocation error:', error);
      throw new Error(`Function invocation failed: ${error.message}`);
    }

    if (data?.error) {
      console.error('Charge card function returned error:', data.error);
      throw new Error(data.error);
    }

    if (!data?.payment_intent_id) {
      console.error('No payment intent ID returned from charge function');
      throw new Error('Invalid response from payment service');
    }

    console.log('Card charged successfully:', data);

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
    console.log('Setting up payment method for customer:', customerId);
    
    if (!customerId || !returnUrl) {
      throw new Error('Customer ID and return URL are required');
    }

    const { data, error } = await supabase.functions.invoke('setup-payment-method', {
      body: {
        customerId,
        returnUrl
      }
    });

    if (error) {
      console.error('Supabase function invocation error:', error);
      throw new Error(`Function invocation failed: ${error.message}`);
    }

    if (data?.error) {
      console.error('Setup payment method function returned error:', data.error);
      throw new Error(data.error);
    }

    if (!data?.clientSecret) {
      console.error('No client secret returned from setup function');
      throw new Error('Invalid response from payment service');
    }

    console.log('Payment method setup successful');

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
    console.log('Saving payment method for customer:', customerId);
    
    if (!customerId || !paymentMethodId) {
      throw new Error('Customer ID and payment method ID are required');
    }

    const { data, error } = await supabase.functions.invoke('save-payment-method', {
      body: {
        customerId,
        paymentMethodId
      }
    });

    if (error) {
      console.error('Supabase function invocation error:', error);
      throw new Error(`Function invocation failed: ${error.message}`);
    }

    if (data?.error) {
      console.error('Save payment method function returned error:', data.error);
      throw new Error(data.error);
    }

    console.log('Payment method saved successfully');

    return { success: true };
  } catch (error: any) {
    console.error('Error saving payment method:', error);
    throw new Error(error.message || 'Failed to save payment method');
  }
}
