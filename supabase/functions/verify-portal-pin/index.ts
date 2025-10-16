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

    const { pin } = await req.json();

    if (!pin) {
      throw new Error('PIN is required');
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('Invalid PIN format');
    }

    // Hash the PIN to look up in database
    const hashedPin = await hashPin(pin);

    // Find customer by PIN hash directly
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, business_name, email, portal_access_enabled, pin_enabled, portal_access_pin, pin_expires_at, pin_failed_attempts, pin_locked_until, auth_user_id')
      .eq('portal_access_pin', hashedPin)
      .eq('pin_enabled', true)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      throw new Error('Authentication failed');
    }

    // Log failed attempt if customer not found (don't reveal if PIN exists)
    if (!customer) {
      await supabase.from('portal_login_attempts').insert({
        email: 'unknown',
        attempt_type: 'pin',
        success: false,
        failure_reason: 'Invalid PIN',
      });
      throw new Error('Invalid PIN');
    }

    // Check if portal access is enabled
    if (!customer.portal_access_enabled) {
      await supabase.from('portal_login_attempts').insert({
        customer_id: customer.id,
        email: customer.email || 'unknown',
        attempt_type: 'pin',
        success: false,
        failure_reason: 'Portal access disabled',
      });
      throw new Error('Portal access is not enabled');
    }

    // Check if account is locked
    if (customer.pin_locked_until) {
      const lockUntil = new Date(customer.pin_locked_until);
      if (lockUntil > new Date()) {
        const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
        await supabase.from('portal_login_attempts').insert({
          customer_id: customer.id,
          email: customer.email || 'unknown',
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
          email: customer.email || 'unknown',
          attempt_type: 'pin',
          success: false,
          failure_reason: 'PIN expired',
        });
        throw new Error('PIN has expired. Please contact support for a new PIN');
      }
    }

    // PIN already matched in the initial lookup, so we know it's correct
    // But we'll still check failed attempts to prevent the issue
    if ((customer.pin_failed_attempts || 0) > 0) {
      // Reset failed attempts since we found the customer
      await supabase
        .from('customers')
        .update({
          pin_failed_attempts: 0,
          pin_locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id);
    }

    // PIN is correct (found by hash lookup) - update login timestamp and create session
    await supabase
      .from('customers')
      .update({
        last_portal_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.id);

    // Log successful attempt
    await supabase.from('portal_login_attempts').insert({
      customer_id: customer.id,
      email: customer.email || 'unknown',
      attempt_type: 'pin',
      success: true,
    });

    // If customer has auth_user_id, create a session
    let sessionTokens = null;
    if (customer.auth_user_id) {
      // Ensure user_roles entry exists for account_customer
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', customer.auth_user_id)
        .eq('role', 'account_customer')
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleInsertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: customer.auth_user_id,
            role: 'account_customer',
            customer_id: customer.id,
          });
        
        if (roleInsertError) {
          console.error('Error creating user_roles:', roleInsertError);
        } else {
          console.log('Created account_customer role for user:', customer.auth_user_id);
        }
      }

      // Generate auth session using admin API
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: customer.email,
      });

      if (sessionError) {
        console.error('Error generating session:', sessionError);
      } else if (sessionData.properties?.hashed_token) {
        // Return the hashed token for client-side verification
        sessionTokens = {
          hashed_token: sessionData.properties.hashed_token,
          email: customer.email,
        };
        console.log('Generated hashed_token for customer:', customer.id);
      }
    }

    console.log('PIN verification successful for customer:', customer.id);

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: customer.id,
        customer_name: customer.company_name || customer.business_name || `${customer.first_name} ${customer.last_name}`.trim(),
        customer_email: customer.email,
        session: sessionTokens,
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