import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { full_name, phone } = await req.json();

    // Validate inputs
    if (!full_name || full_name.trim().length === 0) {
      throw new Error('Full name is required');
    }

    if (full_name.length > 100) {
      throw new Error('Full name must be less than 100 characters');
    }

    if (phone && phone.length > 20) {
      throw new Error('Phone must be less than 20 characters');
    }

    // Update user's own profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update profile');
    }

    console.log(`User ${user.id} updated their own profile`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Profile updated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in update-own-profile:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});