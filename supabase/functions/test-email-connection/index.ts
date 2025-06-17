
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Verify the user is authenticated and is an admin
    const { data: userData, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    const { api_key, sender_email, sender_name } = await req.json();

    if (!api_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Resend API key is required" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate API key format
    if (!api_key.startsWith('re_')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid Resend API key format. Should start with 're_'" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Initialize Resend with the provided API key
    const resend = new Resend(api_key);

    // Test the connection by sending a test email to the admin
    const testEmailResult = await resend.emails.send({
      from: `${sender_name} <${sender_email}>`,
      to: [userData.user.email!],
      subject: "Email Configuration Test - SwiftDispatch Pro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Email Test Successful!</h1>
          <p>Congratulations! Your email configuration is working correctly.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>Sender Name:</strong> ${sender_name}</li>
              <li><strong>Sender Email:</strong> ${sender_email}</li>
              <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p>Your SwiftDispatch Pro system can now send emails successfully!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated test email from SwiftDispatch Pro
          </p>
        </div>
      `,
    });

    if (testEmailResult.error) {
      throw new Error(testEmailResult.error.message);
    }

    // Update the email settings with successful connection status
    await supabase
      .from("email_settings")
      .update({
        connection_status: "connected",
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("email_provider", "resend");

    console.log("Email test successful:", testEmailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email connection test successful! Check your inbox for the test email.",
        email_id: testEmailResult.data?.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Email connection test failed:', error);
    
    // Update the email settings with error status
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from("email_settings")
        .update({
          connection_status: "error",
          last_tested_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("email_provider", "resend");
    } catch (dbError) {
      console.error('Failed to update email settings status:', dbError);
    }
    
    let errorMessage = "Failed to send test email";
    if (error.message?.includes('API key')) {
      errorMessage = "Invalid Resend API key";
    } else if (error.message?.includes('domain')) {
      errorMessage = "Domain not verified in Resend. Please verify your sending domain.";
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
