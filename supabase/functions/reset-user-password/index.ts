import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, new_password } = await req.json();
    
    if (!user_id || !new_password) {
      throw new Error('user_id and new_password are required');
    }
    
    if (new_password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    const { data: isSuperAdmin, error: roleError } = await supabaseClient.rpc('is_super_admin', {
      _user_id: user.id
    });
    
    if (roleError || !isSuperAdmin) {
      throw new Error('Only super admins can reset passwords');
    }
    
    // Check if caller can manage target user (prevents self-reset)
    const { data: canManage, error: manageError } = await supabaseClient.rpc('can_manage_user', {
      _actor_id: user.id,
      _target_id: user_id
    });
    
    if (manageError || !canManage) {
      throw new Error('Cannot reset password for this user. Super admins cannot reset their own password via this method.');
    }
    
    if (user_id === user.id) {
      throw new Error('Please use the normal password reset flow for your own account');
    }
    
    const { data: targetProfile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();
    
    if (!targetProfile) {
      throw new Error('Target user not found');
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );
    
    if (updateError) {
      console.error('[reset-password] Update error:', updateError);
      throw new Error(`Failed to reset password: ${updateError.message}`);
    }
    
    await supabaseClient.rpc('log_admin_activity', {
      p_action_type: 'reset_user_password',
      p_target_type: 'user',
      p_target_id: user_id,
      p_target_details: {
        reset_by: user.id,
        reset_by_email: user.email,
        target_email: targetProfile.email
      },
      p_description: `Admin ${user.email} reset password for ${targetProfile.email}`
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset successfully for ${targetProfile.email}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[reset-password] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
