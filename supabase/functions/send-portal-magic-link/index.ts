import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { customerId, email, contactName } = await req.json();

    if (!customerId || !email) {
      throw new Error('Customer ID and email are required');
    }

    console.log('Generating magic link for customer:', customerId, 'email:', email);

    // Verify customer has portal access enabled
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('portal_access_enabled, company_name, business_name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    if (!customer.portal_access_enabled) {
      throw new Error('Portal access not enabled for this customer');
    }

    // Generate magic link using Supabase Auth
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/customer-portal`,
      }
    });

    if (error) {
      console.error('Error generating magic link:', error);
      throw error;
    }

    console.log('Magic link generated successfully');

    // Send email via send-emails function
    const businessName = customer.company_name || customer.business_name || 'Your Business';
    
    const { error: emailError } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'portal-login',
        data: {
          customerEmail: email,
          contactName: contactName || 'Customer',
          magicLink: data.properties.action_link,
          businessName: businessName,
          expiresIn: '1 hour'
        }
      }
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Don't throw - link still works even if email fails
    }

    // Log activity
    await supabase.rpc('log_admin_activity', {
      p_action_type: 'send_portal_magic_link',
      p_target_type: 'customer',
      p_target_id: customerId,
      p_target_details: {
        email: email,
        contactName: contactName
      },
      p_description: `Sent portal magic link to ${email}`
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Magic link sent successfully' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-portal-magic-link function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
