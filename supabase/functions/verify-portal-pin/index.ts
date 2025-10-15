import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash PIN using Web Crypto API (must match generation)
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

    const { email, pin } = await req.json();

    if (!email || !pin) {
      throw new Error('Email and PIN are required');
    }

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('Invalid PIN format');
    }

    // Get customer by email
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, portal_access_enabled, pin_enabled, portal_access_pin, pin_expires_at, pin_failed_attempts, pin_locked_until, auth_user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      throw new Error('Authentication failed');
    }

    // Log failed attempt if customer not found
    if (!customer) {
      await supabase.from('portal_login_attempts').insert({
        email: email.toLowerCase(),
        attempt_type: 'pin',
        success: false,
        failure_reason: 'Customer not found',
      });
      throw new Error('Invalid email or PIN');
    }

    // Check if portal access is enabled
    if (!customer.portal_access_enabled) {
      await supabase.from('portal_login_attempts').insert({
        customer_id: customer.id,
        email: email.toLowerCase(),
        attempt_type: 'pin',
        success: false,
        failure_reason: 'Portal access disabled',
      });
      throw new Error('Portal access is not enabled');
    }

    // Check if PIN is enabled
    if (!customer.pin_enabled || !customer.portal_access_pin) {
      await supabase.from('portal_login_attempts').insert({
        customer_id: customer.id,
        email: email.toLowerCase(),
        attempt_type: 'pin',
        success: false,
        failure_reason: 'PIN not enabled',
      });
      throw new Error('PIN authentication is not enabled for this account');
    }

    // Check if account is locked
    if (customer.pin_locked_until) {
      const lockUntil = new Date(customer.pin_locked_until);
      if (lockUntil > new Date()) {
        const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
        await supabase.from('portal_login_attempts').insert({
          customer_id: customer.id,
          email: email.toLowerCase(),
          attempt_type: 'pin',
          success: false,
          failure_reason: 'Account locked',
        });
        throw new Error(`Account is locked. Try again in ${minutesRemaining} minute(s)`);
      }
    }

    // Check if PIN has expired
    if (customer.pin_expires_at) {
      const expiresAt = new Date(customer.pin_expires_at);
      if (expiresAt < new Date()) {
        await supabase.from('portal_login_attempts').insert({
          customer_id: customer.id,
          email: email.toLowerCase(),
          attempt_type: 'pin',
          success: false,
          failure_reason: 'PIN expired',
        });
        throw new Error('PIN has expired. Please contact support for a new PIN');
      }
    }

    // Hash the provided PIN and compare
    const hashedPin = await hashPin(pin);
    const pinMatches = hashedPin === customer.portal_access_pin;

    if (!pinMatches) {
      // Increment failed attempts
      const newFailedAttempts = (customer.pin_failed_attempts || 0) + 1;
      const maxAttempts = 5;

      let lockUntil = null;
      if (newFailedAttempts >= maxAttempts) {
        // Lock account for 30 minutes
        lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
      }

      await supabase
        .from('customers')
        .update({
          pin_failed_attempts: newFailedAttempts,
          pin_locked_until: lockUntil?.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id);

      await supabase.from('portal_login_attempts').insert({
        customer_id: customer.id,
        email: email.toLowerCase(),
        attempt_type: 'pin',
        success: false,
        failure_reason: 'Incorrect PIN',
      });

      const remainingAttempts = maxAttempts - newFailedAttempts;
      if (remainingAttempts > 0) {
        throw new Error(`Invalid PIN. ${remainingAttempts} attempt(s) remaining`);
      } else {
        throw new Error('Account locked for 30 minutes due to too many failed attempts');
      }
    }

    // PIN is correct - reset failed attempts and create session
    await supabase
      .from('customers')
      .update({
        pin_failed_attempts: 0,
        pin_locked_until: null,
        last_portal_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.id);

    // Log successful attempt
    await supabase.from('portal_login_attempts').insert({
      customer_id: customer.id,
      email: email.toLowerCase(),
      attempt_type: 'pin',
      success: true,
    });

    // If customer has auth_user_id, create a session
    let session = null;
    if (customer.auth_user_id) {
      // Generate auth session using admin API
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: customer.email,
      });

      if (sessionError) {
        console.error('Error generating session:', sessionError);
      } else {
        session = sessionData;
      }
    }

    console.log('PIN verification successful for customer:', customer.id);

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: customer.id,
        customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
        session,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in verify-portal-pin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});