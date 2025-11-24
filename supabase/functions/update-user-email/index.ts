import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin using has_role function
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin' as any,
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only admins can update user emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, newEmail } = await req.json();

    if (!userId || !newEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or newEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from updating their own email via this function
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Please use account settings to update your own email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: 'Email format is invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get old email for logging
    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUserError || !targetUser.user) {
      console.error('Target user not found:', targetUserError);
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldEmail = targetUser.user.email;

    // Check if email already exists
    const { data: existingUser, error: existingError } = await supabaseAdmin.auth.admin.listUsers();
    if (!existingError) {
      const emailExists = existingUser.users.some(u => u.email === newEmail && u.id !== userId);
      if (emailExists) {
        return new Response(
          JSON.stringify({ error: 'Email already in use by another user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update email in auth.users using admin API
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (updateAuthError) {
      console.error('Error updating auth.users:', updateAuthError);
      throw updateAuthError;
    }

    // Update email in profiles table
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error updating profiles:', updateProfileError);
      // Attempt to rollback auth update
      await supabaseAdmin.auth.admin.updateUserById(userId, { email: oldEmail });
      throw updateProfileError;
    }

    // Log the activity (non-blocking)
    try {
      await supabaseClient.rpc('log_admin_activity', {
        p_action_type: 'update_user_email',
        p_target_type: 'user',
        p_target_id: userId,
        p_target_details: {
          old_email: oldEmail,
          new_email: newEmail,
        },
        p_old_values: { email: oldEmail },
        p_new_values: { email: newEmail },
        p_description: `Updated email from ${oldEmail} to ${newEmail}`,
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    console.log(`Email updated successfully for user ${userId}: ${oldEmail} -> ${newEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email updated successfully',
        oldEmail,
        newEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-user-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
