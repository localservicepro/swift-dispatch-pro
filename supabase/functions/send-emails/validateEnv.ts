
import { Resend } from 'npm:resend@4.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

export function validateEnv() {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!resendApiKey) throw new Error('RESEND_API_KEY not configured')
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase configuration missing')

  const resend = new Resend(resendApiKey)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  return { resend, supabase }
}
