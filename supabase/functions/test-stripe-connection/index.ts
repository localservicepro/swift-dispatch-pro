
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { publishable_key, secret_key, is_live_mode } = await req.json();

    if (!secret_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Secret key is required" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate key format
    const expectedPrefix = is_live_mode ? 'sk_live_' : 'sk_test_';
    if (!secret_key.startsWith(expectedPrefix)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Invalid secret key format. Expected ${expectedPrefix}...` 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Initialize Stripe with the provided secret key
    const stripe = new Stripe(secret_key, {
      apiVersion: "2023-10-16",
    });

    // Test the connection by retrieving account information
    const account = await stripe.accounts.retrieve();
    
    // Verify the account is in the expected mode
    const accountLiveMode = !account.id.startsWith('acct_');
    if (accountLiveMode !== is_live_mode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Account mode mismatch. Expected ${is_live_mode ? 'live' : 'test'} mode but got ${accountLiveMode ? 'live' : 'test'} mode.` 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully connected to Stripe ${is_live_mode ? 'live' : 'test'} account: ${account.business_profile?.name || account.email || 'Account verified'}`,
        account_id: account.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Stripe connection test failed:', error);
    
    let errorMessage = "Failed to connect to Stripe";
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = "Invalid Stripe API key";
    } else if (error.type === 'StripePermissionError') {
      errorMessage = "Insufficient permissions for this API key";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
