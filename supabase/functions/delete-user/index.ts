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
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('user_id is required');
    }
    
    // Initialize client with anon key to check caller permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    console.log(`[delete-user] Admin ${user.email} attempting to delete user ${user_id}`);
    
    // Check if caller is super admin
    const { data: isSuperAdmin, error: roleError } = await supabaseClient.rpc('is_super_admin', {
      _user_id: user.id
    });
    
    if (roleError || !isSuperAdmin) {
      console.error('[delete-user] Permission denied:', roleError);
      throw new Error('Only super admins can delete users');
    }
    
    // Check if caller can manage target user (prevents self-deletion)
    const { data: canManage, error: manageError } = await supabaseClient.rpc('can_manage_user', {
      _actor_id: user.id,
      _target_id: user_id
    });
    
    if (manageError || !canManage) {
      throw new Error('Cannot delete this user. Super admins cannot delete themselves.');
    }
    
    // Prevent self-deletion
    if (user_id === user.id) {
      throw new Error('You cannot delete your own account');
    }
    
    // Check if target user exists and get their roles
    const { data: targetRoles, error: targetRolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id);
    
    if (targetRolesError) {
      console.error('[delete-user] Error fetching target roles:', targetRolesError);
      throw new Error('Failed to verify target user');
    }
    
    if (!targetRoles || targetRoles.length === 0) {
      throw new Error('Target user not found');
    }
    
    // If deleting a super_admin, check if they're the last super admin
    const hasSuperAdminRole = targetRoles.some(r => r.role === 'super_admin');
    if (hasSuperAdminRole) {
      const { count, error: superAdminCountError } = await supabaseClient
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'super_admin');
      
      if (superAdminCountError) {
        console.error('[delete-user] Error checking super admin count:', superAdminCountError);
        throw new Error('Failed to check super admin count');
      }
      
      if (count && count <= 1) {
        throw new Error('Cannot delete the last super admin user');
      }
    }
    
    // Initialize admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    console.log(`[delete-user] Deleting user ${user_id} from auth.users`);
    
    // Delete user from auth.users (cascade will handle profiles and user_roles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    if (deleteError) {
      console.error('[delete-user] Delete error:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }
    
    console.log(`[delete-user] User ${user_id} deleted successfully`);
    
    // Log activity
    await supabaseClient.rpc('log_admin_activity', {
      p_action_type: 'delete_user',
      p_target_type: 'user',
      p_target_id: user_id,
      p_target_details: { deleted_by: user.id, deleted_by_email: user.email },
      p_description: `Admin ${user.email} deleted user ${user_id}`
    });
    
    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('[delete-user] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
