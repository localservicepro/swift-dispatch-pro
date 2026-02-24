import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Weak PIN patterns to avoid
const WEAK_PINS = [
  '000000', '111111', '222222', '333333', '444444', '555555', 
  '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '234567', '345678', '456789',
  '987654', '876543', '765432', '543210'
];

// Check if PIN is weak (repeating digits or sequential)
function isWeakPin(pin: string): boolean {
  if (WEAK_PINS.includes(pin)) return true;
  if (/^(.)\1{5}$/.test(pin)) return true; // All same digit
  return false;
}

// Generate secure 6-digit PIN
function generateSecurePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const pin = (array[0] % 1000000).toString().padStart(6, '0');
  
  if (isWeakPin(pin)) {
    return generateSecurePin(); // Regenerate if weak
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
      .select('id, first_name, last_name, email, portal_access_enabled, company_name, business_name')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    if (!customer.email) {
      throw new Error('Customer email is required for PIN generation');
    }

    // Generate unique PIN with retry logic
    let plainPin = '';
    let hashedPin = '';
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      plainPin = generateSecurePin();
      hashedPin = await hashPin(plainPin);
      
      // Check if this PIN already exists
      const { data: existingPin, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('portal_access_pin', hashedPin)
        .eq('pin_enabled', true)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking PIN uniqueness:', checkError);
        throw new Error('Failed to generate PIN');
      }
      
      // If no existing PIN found, we have a unique one
      if (!existingPin) {
        break;
      }
      
      attempts++;
      console.log(`PIN collision detected, regenerating (attempt ${attempts}/${maxAttempts})`);
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique PIN after multiple attempts. Please try again.');
    }

    // Set expiration (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Update customer with PIN
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        portal_access_pin: hashedPin,
        pin_enabled: true,
        portal_access_enabled: true,
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

    // Delete any previous unsent webhook records for this customer
    try {
      await supabase
        .from('portal_pin_webhooks')
        .delete()
        .eq('customer_id', customer_id)
        .eq('webhook_sent', false);

      await supabase.from('portal_pin_webhooks').insert({
        customer_id,
        customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer',
        customer_email: customer.email,
        company_name: customer.company_name || customer.business_name || null,
        pin_code: plainPin,
        pin_expires_at: expiresAt.toISOString(),
        is_regeneration: regenerate,
      });
    } catch (webhookErr) {
      console.error('Error inserting PIN webhook record:', webhookErr);
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