
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoLoginRequest {
  email: string
  orderId: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== AUTO-LOGIN CUSTOMER STARTED ===')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email, orderId }: AutoLoginRequest = await req.json()
    console.log('Auto-login request for email:', email, 'orderId:', orderId)

    // Verify the order exists and belongs to this email
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_id')
      .eq('id', orderId)
      .eq('customer_phone', email) // Assuming email is stored in customer_phone for now
      .single()

    if (orderError) {
      console.error('Order validation error:', orderError)
      // Try to find by customer email in customers table
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, email')
        .eq('email', email)
        .single()

      if (customerError) {
        throw new Error('Invalid email or order ID')
      }

      // Check if order belongs to this customer
      const { data: orderByCustomer, error: orderByCustomerError } = await supabase
        .from('orders')
        .select('id, customer_name')
        .eq('id', orderId)
        .eq('customer_id', customerData.id)
        .single()

      if (orderByCustomerError) {
        throw new Error('Invalid email or order ID')
      }
    }

    console.log('Order validated successfully for customer')

    // Check if customer already has an auth account
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    let authUserId: string

    if (existingProfile) {
      console.log('Customer already has an account, using existing')
      authUserId = existingProfile.id
    } else {
      console.log('Creating new customer account')
      
      // Create a new auth user with order ID as temporary password
      const temporaryPassword = `order-${orderId}`
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: orderData?.customer_name || 'Customer',
          role: 'customer'
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        throw new Error('Failed to create customer account')
      }

      authUserId = authData.user.id
      console.log('New auth user created:', authUserId)

      // Update customer record with auth_user_id
      const { data: customerRecord, error: customerFindError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .single()

      if (customerRecord) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({ auth_user_id: authUserId })
          .eq('id', customerRecord.id)

        if (updateError) {
          console.error('Error linking customer to auth user:', updateError)
        }
      }
    }

    // Generate a sign-in link or token for immediate login
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin')}/customer`
      }
    })

    if (signInError) {
      console.error('Error generating sign-in link:', signInError)
      throw new Error('Failed to generate login credentials')
    }

    console.log('=== AUTO-LOGIN CUSTOMER COMPLETED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Customer account ready',
        authUserId: authUserId,
        signInUrl: signInData.properties?.action_link,
        temporaryPassword: `order-${orderId}`,
        isNewAccount: !existingProfile
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error: any) {
    console.error('=== ERROR in auto-login-customer ===', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create customer login',
        details: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
