import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate secure 6-digit PIN
function generateSecurePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const pin = (array[0] % 1000000).toString().padStart(6, '0');
  
  // Avoid weak PINs like 000000, 111111, 123456
  const weakPins = ['000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123456', '654321'];
  if (weakPins.includes(pin)) {
    return generateSecurePin(); // Recursive call for weak PIN
  }
  
  return pin;
}

// Hash PIN using Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customer_id, regenerate = false } = await req.json();

    if (!customer_id) {
      throw new Error('Customer ID is required');
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, portal_access_enabled')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    if (!customer.portal_access_enabled) {
      throw new Error('Portal access is not enabled for this customer');
    }

    if (!customer.email) {
      throw new Error('Customer email is required for PIN generation');
    }

    // Generate PIN and hash it
    const plainPin = generateSecurePin();
    const hashedPin = await hashPin(plainPin);

    // Set expiration (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Update customer with PIN
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        portal_access_pin: hashedPin,
        pin_enabled: true,
        pin_created_at: new Date().toISOString(),
        pin_expires_at: expiresAt.toISOString(),
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer_id);

    if (updateError) {
      console.error('Error updating customer PIN:', updateError);
      throw new Error('Failed to update customer PIN');
    }

    // Send email with PIN
    const emailType = regenerate ? 'portal-pin-regenerated' : 'portal-pin-created';
    const { error: emailError } = await supabase.functions.invoke('send-emails', {
      body: {
        emailType,
        emailData: {
          to: customer.email,
          customerName: `${customer.first_name} ${customer.last_name}`.trim() || 'Customer',
          pin: plainPin,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    if (emailError) {
      console.error('Error sending PIN email:', emailError);
      // Don't fail the whole operation if email fails
    }

    // Log activity
    await supabase.rpc('log_admin_activity', {
      p_action_type: regenerate ? 'regenerate_portal_pin' : 'generate_portal_pin',
      p_target_type: 'customer',
      p_target_id: customer_id,
      p_description: `${regenerate ? 'Regenerated' : 'Generated'} portal PIN for ${customer.first_name} ${customer.last_name}`,
    });

    console.log(`PIN ${regenerate ? 'regenerated' : 'generated'} for customer:`, customer_id);

    return new Response(
      JSON.stringify({
        success: true,
        pin: plainPin, // Return plain PIN only once for admin to share
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in generate-portal-pin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});