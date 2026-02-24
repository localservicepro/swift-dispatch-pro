import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WEAK_PINS = [
  '000000', '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '234567', '345678', '456789',
  '987654', '876543', '765432', '543210'
];

function isWeakPin(pin: string): boolean {
  if (WEAK_PINS.includes(pin)) return true;
  if (/^(.)\1{5}$/.test(pin)) return true;
  return false;
}

function generateSecurePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const pin = (array[0] % 1000000).toString().padStart(6, '0');
  if (isWeakPin(pin)) return generateSecurePin();
  return pin;
}

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin'])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { customer_ids, all_without_pins, send_emails = true } = await req.json();

    let customersToProcess: any[] = [];

    if (all_without_pins) {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, portal_access_enabled, pin_enabled')
        .eq('customer_type', 'account')
        .eq('is_active', true)
        .or('pin_enabled.is.null,pin_enabled.eq.false');

      if (error) throw new Error(`Failed to fetch customers: ${error.message}`);
      customersToProcess = data || [];
    } else if (customer_ids && customer_ids.length > 0) {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, portal_access_enabled, pin_enabled')
        .in('id', customer_ids)
        .eq('is_active', true);

      if (error) throw new Error(`Failed to fetch customers: ${error.message}`);
      customersToProcess = data || [];
    } else {
      throw new Error('Provide customer_ids or set all_without_pins to true');
    }

    const results = {
      total: customersToProcess.length,
      success: 0,
      failed: 0,
      skipped: 0,
      failures: [] as { customer_id: string; name: string; error: string }[],
    };

    for (const customer of customersToProcess) {
      try {
        if (!customer.email) {
          results.skipped++;
          results.failures.push({
            customer_id: customer.id,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            error: 'No email address',
          });
          continue;
        }

        // Generate unique PIN
        let plainPin = '';
        let hashedPin = '';
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
          plainPin = generateSecurePin();
          hashedPin = await hashPin(plainPin);

          const { data: existingPin } = await supabase
            .from('customers')
            .select('id')
            .eq('portal_access_pin', hashedPin)
            .eq('pin_enabled', true)
            .maybeSingle();

          if (!existingPin) break;
          attempts++;
        }

        if (attempts >= maxAttempts) {
          results.failed++;
          results.failures.push({
            customer_id: customer.id,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            error: 'Could not generate unique PIN',
          });
          continue;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

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
          .eq('id', customer.id);

        if (updateError) {
          results.failed++;
          results.failures.push({
            customer_id: customer.id,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            error: updateError.message,
          });
          continue;
        }

        // Send email if requested
        if (send_emails) {
          try {
            await supabase.functions.invoke('send-emails', {
              body: {
                emailType: 'portal-pin-created',
                emailData: {
                  to: customer.email,
                  customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer',
                  pin: plainPin,
                  expiresAt: expiresAt.toISOString(),
                },
              },
            });
          } catch (emailErr) {
            console.error(`Email failed for ${customer.id}:`, emailErr);
            // Don't fail the whole operation for email errors
          }
        }

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.failures.push({
          customer_id: customer.id,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          error: err.message,
        });
      }
    }

    // Log activity
    try {
      await supabase.rpc('log_admin_activity', {
        p_action_type: 'bulk_generate_portal_pins',
        p_target_type: 'customer',
        p_description: `Bulk generated PINs: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped out of ${results.total}`,
      });
    } catch (logErr) {
      console.error('Failed to log activity:', logErr);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in bulk-generate-portal-pins:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
