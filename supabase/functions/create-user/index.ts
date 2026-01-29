
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'driver';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client for auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Create Supabase client with service role key for permission check and admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user is super_admin or admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { _user_id: user.id });
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });

    if (!isSuperAdmin && !isAdmin) {
      throw new Error('Only admins can create users');
    }

    const { email, password, full_name, phone, role }: CreateUserRequest = await req.json();

    // Regular admins can only create drivers, super admins can create both
    if (!isSuperAdmin && role === 'admin') {
      throw new Error('Only super admins can create admin accounts');
    }

    console.log('Creating user:', { email, full_name, role });

    // Create user with admin privileges
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        role
      },
      email_confirm: true
    });

    if (createUserError) {
      console.error('Auth error:', createUserError);
      // Provide user-friendly error messages for common cases
      let errorMessage = createUserError.message || 'Failed to create user';
      if (createUserError.code === 'email_exists' || errorMessage.includes('already been registered')) {
        errorMessage = 'A user with this email address already exists. Please use a different email.';
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('User created successfully:', authData.user?.id);

    // The trigger will auto-create profile and user_roles entries
    // But we can update profile with additional info like phone
    if (authData.user && phone) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          phone: phone
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't throw here as the user was created successfully
      }
    }

    console.log('User role assigned via trigger:', role);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        message: `${role === 'driver' ? 'Driver' : 'Admin'} created successfully!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create user' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
