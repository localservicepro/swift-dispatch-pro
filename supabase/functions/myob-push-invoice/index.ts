import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MYOB_API_BASE = "https://api.myob.com/accountright";

interface LineItem {
  orderNumber: string;
  description: string;
  accountNumber: string;
  amount: number;
  date: string;
  taxCode: string;
}

interface PushInvoiceRequest {
  orderIds: string[];
  customerName: string;
  invoiceDate: string;
  lineItems: LineItem[];
  customerPO?: string;
}

const logStep = (step: string, details?: any) => {
  console.log(`[MYOB-PUSH] ${step}`, details ? JSON.stringify(details) : "");
};

async function ensureTokenFresh(supabase: any, settings: any) {
  if (!settings.token_expires_at) return settings;
  const expiresAt = new Date(settings.token_expires_at).getTime();
  const now = Date.now();
  // Refresh if within 5 minutes of expiry
  if (expiresAt - now < 5 * 60 * 1000) {
    logStep("Refreshing MYOB token");
    const tokenRes = await fetch("https://secure.myob.com/oauth2/v1/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        grant_type: "refresh_token",
        refresh_token: settings.refresh_token,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error("Token refresh failed: " + (tokenData.error_description || "Unknown error"));

    await supabase.from("myob_settings").update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    }).eq("id", settings.id);

    settings.access_token = tokenData.access_token;
    settings.refresh_token = tokenData.refresh_token;
  }
  return settings;
}

function getMyobHeaders(settings: any) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${settings.access_token}`,
    "x-myobapi-key": settings.client_id,
    "x-myobapi-version": "v2",
    "Content-Type": "application/json",
  };
  // Add company file auth if credentials exist
  if (settings.company_file_username) {
    const creds = btoa(`${settings.company_file_username}:${settings.company_file_password || ""}`);
    headers["x-myobapi-cftoken"] = creds;
  }
  return headers;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .limit(1);
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const requestBody: PushInvoiceRequest = await req.json();
    const { orderIds, customerName, invoiceDate, lineItems, customerPO } = requestBody;

    logStep("Starting MYOB invoice push", { orderIds, customerName });

    // Get MYOB settings
    let settings = await supabase.from("myob_settings").select("*").limit(1).single();
    if (!settings.data?.access_token) {
      throw new Error("MYOB is not connected. Please configure MYOB in Settings.");
    }
    let myobSettings = settings.data;

    // Refresh token if needed
    myobSettings = await ensureTokenFresh(supabase, myobSettings);

    const companyFileUrl = `${MYOB_API_BASE}/${myobSettings.company_file_id}`;
    const headers = getMyobHeaders(myobSettings);

    // Step 1: Auto-match customer by company name
    logStep("Searching for customer in MYOB", { customerName });
    const customerSearchRes = await fetch(
      `${companyFileUrl}/Contact/Customer?$filter=CompanyName eq '${encodeURIComponent(customerName)}'`,
      { headers }
    );

    let customerUID: string;
    if (customerSearchRes.ok) {
      const customerData = await customerSearchRes.json();
      if (customerData.Items && customerData.Items.length > 0) {
        customerUID = customerData.Items[0].UID;
        logStep("Found existing MYOB customer", { customerUID, displayId: customerData.Items[0].DisplayID });
      } else {
        // Create new customer
        logStep("Customer not found, creating in MYOB");
        const createCustomerRes = await fetch(`${companyFileUrl}/Contact/Customer`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            CompanyName: customerName,
            IsActive: true,
          }),
        });

        if (!createCustomerRes.ok) {
          const errBody = await createCustomerRes.text();
          throw new Error(`Failed to create customer in MYOB: ${errBody}`);
        }

        // Get the UID from Location header or re-fetch
        const locationHeader = createCustomerRes.headers.get("Location");
        if (locationHeader) {
          const uidMatch = locationHeader.match(/([a-f0-9-]{36})/i);
          customerUID = uidMatch ? uidMatch[1] : "";
        }
        if (!customerUID!) {
          // Re-fetch to get UID
          const refetchRes = await fetch(
            `${companyFileUrl}/Contact/Customer?$filter=CompanyName eq '${encodeURIComponent(customerName)}'`,
            { headers }
          );
          const refetchData = await refetchRes.json();
          customerUID = refetchData.Items?.[0]?.UID;
        }
        if (!customerUID!) throw new Error("Could not determine new customer UID from MYOB");
        logStep("Created new MYOB customer", { customerUID });
      }
    } else {
      const errText = await customerSearchRes.text();
      throw new Error(`MYOB customer search failed: ${errText}`);
    }

    // Step 2: Build MYOB Sale Invoice
    // Get tax code UID for GST
    const taxCodeRes = await fetch(`${companyFileUrl}/GeneralLedger/TaxCode?$filter=Code eq 'GST'`, { headers });
    let gstTaxCodeUID = "";
    if (taxCodeRes.ok) {
      const taxData = await taxCodeRes.json();
      if (taxData.Items?.length > 0) {
        gstTaxCodeUID = taxData.Items[0].UID;
      }
    }

    // Get FRE tax code for items marked as FRE
    const freTaxRes = await fetch(`${companyFileUrl}/GeneralLedger/TaxCode?$filter=Code eq 'FRE'`, { headers });
    let freTaxCodeUID = "";
    if (freTaxRes.ok) {
      const freData = await freTaxRes.json();
      if (freData.Items?.length > 0) {
        freTaxCodeUID = freData.Items[0].UID;
      }
    }

    // Get account UID
    const defaultAccount = myobSettings.default_account_number || "4-1010";
    const accountRes = await fetch(
      `${companyFileUrl}/GeneralLedger/Account?$filter=DisplayID eq '${defaultAccount}'`,
      { headers }
    );
    let accountUID = "";
    if (accountRes.ok) {
      const accountData = await accountRes.json();
      if (accountData.Items?.length > 0) {
        accountUID = accountData.Items[0].UID;
      }
    }

    // Build invoice lines
    const invoiceLines = lineItems.map((item) => {
      const taxUID = item.taxCode === "FRE" ? freTaxCodeUID : gstTaxCodeUID;
      const line: any = {
        Type: "Transaction",
        Description: item.description,
        Total: item.amount,
        TaxCode: taxUID ? { UID: taxUID } : undefined,
      };
      // Use item-specific account or default
      if (accountUID) {
        line.Account = { UID: accountUID };
      }
      return line;
    });

    const invoicePayload: any = {
      Date: invoiceDate,
      Customer: { UID: customerUID },
      Lines: invoiceLines,
      IsTaxInclusive: true,
    };

    if (customerPO) {
      invoicePayload.CustomerPurchaseOrderNumber = customerPO;
    }

    logStep("Creating MYOB Sale Invoice", { lineCount: invoiceLines.length });

    const invoiceRes = await fetch(`${companyFileUrl}/Sale/Invoice/Service`, {
      method: "POST",
      headers,
      body: JSON.stringify(invoicePayload),
    });

    if (!invoiceRes.ok) {
      const errBody = await invoiceRes.text();
      throw new Error(`Failed to create MYOB invoice: ${errBody}`);
    }

    // Get the created invoice number
    let myobInvoiceNumber = "";
    const invoiceLocation = invoiceRes.headers.get("Location");
    if (invoiceLocation) {
      // Fetch the created invoice to get the Number
      const getInvoiceRes = await fetch(invoiceLocation, { headers });
      if (getInvoiceRes.ok) {
        const invoiceData = await getInvoiceRes.json();
        myobInvoiceNumber = invoiceData.Number || invoiceData.InvoiceNumber || "";
      }
    }

    // If we couldn't get the number from Location header, try to find it
    if (!myobInvoiceNumber) {
      const recentRes = await fetch(
        `${companyFileUrl}/Sale/Invoice/Service?$top=1&$orderby=Date desc&$filter=Customer/UID eq guid'${customerUID}'`,
        { headers }
      );
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        if (recentData.Items?.length > 0) {
          myobInvoiceNumber = recentData.Items[0].Number || "";
        }
      }
    }

    logStep("MYOB Invoice created", { myobInvoiceNumber });

    // Step 3: Update orders with MYOB invoice number
    if (myobInvoiceNumber) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ myob_invoice_number: myobInvoiceNumber })
        .in("id", orderIds);

      if (updateError) {
        logStep("Warning: Failed to update orders with MYOB invoice number", { error: updateError });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        myobInvoiceNumber,
        orderCount: orderIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("MYOB Push Invoice error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
