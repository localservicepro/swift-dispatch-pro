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
    
    // Check if caller is admin using has_role function
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    if (roleError || !isAdmin) {
      console.error('[delete-user] Permission denied:', roleError);
      throw new Error('Only admins can delete users');
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
    
    // If deleting an admin, check if they're the last admin
    const hasAdminRole = targetRoles.some(r => r.role === 'admin');
    if (hasAdminRole) {
      const { count, error: adminCountError } = await supabaseClient
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (adminCountError) {
        console.error('[delete-user] Error checking admin count:', adminCountError);
        throw new Error('Failed to check admin count');
      }
      
      if (count && count <= 1) {
        throw new Error('Cannot delete the last admin user');
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
