import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API helpers
async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${claimB64}`;

  // Import the private key
  const pemContent = serviceAccountKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

const HEADER_ROW = [
  "Order #", "PO", "Date", "Customer", "Company", "Phone", "Address",
  "Products", "Subtotal", "Delivery Fee", "Total", "Payment Method",
  "Payment Status", "Order Status", "Driver", "Truck", "Delivery Date",
  "Delivery Time", "Notes"
];

function orderToRow(order: any): string[] {
  const products = Array.isArray(order.products)
    ? order.products.map((p: any) => `${p.quantity || 1}x ${p.name || p.product_name || 'Product'}`).join(', ')
    : '';
  return [
    order.order_number || '',
    order.purchase_order || '',
    order.created_at ? new Date(order.created_at).toLocaleDateString() : '',
    order.customer_name || '',
    order.company_name || order.business_name || '',
    order.customer_phone || '',
    order.delivery_address || order.customer_address || '',
    products,
    String(order.subtotal ?? order.total_amount ?? 0),
    String(order.delivery_fee ?? 0),
    String(order.total_amount ?? 0),
    order.payment_method || '',
    order.payment_status || '',
    order.status || '',
    order.driver_name || '',
    order.truck_registration || '',
    order.delivery_date || '',
    order.delivery_time || '',
    order.order_notes || '',
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKeyRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyRaw) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY secret is not configured');
    }

    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, orders, order_id } = await req.json();

    // Get settings
    const { data: settings, error: settingsError } = await supabase
      .from('google_sheets_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      throw new Error('Google Sheets settings not found');
    }

    if (!settings.spreadsheet_id) {
      throw new Error('Spreadsheet ID not configured');
    }

    const accessToken = await getAccessToken(serviceAccountKey);
    const spreadsheetId = settings.spreadsheet_id;
    const sheetName = settings.sheet_name || 'Orders';

    if (action === 'test-connection') {
      // Try to read the sheet
      const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=properties.title`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cannot access spreadsheet: ${err}`);
      }
      const data = await res.json();

      await supabase
        .from('google_sheets_settings')
        .update({ connection_status: 'connected', service_account_email: serviceAccountKey.client_email })
        .eq('id', settings.id);

      return new Response(JSON.stringify({ success: true, title: data.properties?.title }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync-single') {
      // Fetch the order with customer info
      let orderData = orders?.[0];
      if (!orderData && order_id) {
        const { data: fetchedOrder } = await supabase
          .from('orders')
          .select('*, customers(company_name, business_name)')
          .eq('id', order_id)
          .is('deleted_at', null)
          .single();
        if (fetchedOrder) {
          orderData = {
            ...fetchedOrder,
            company_name: fetchedOrder.customers?.company_name,
            business_name: fetchedOrder.customers?.business_name,
          };
        }
      }

      if (!orderData) {
        throw new Error('No order data provided');
      }

      // Check if header exists
      const headerRes = await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1:S1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const headerData = await headerRes.json();

      if (!headerData.values || headerData.values.length === 0) {
        // Write header
        await fetch(`${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1:S1?valueInputOption=RAW`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [HEADER_ROW] }),
        });
      }

      // Find existing row by order number
      const allRes = await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:A`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const allData = await allRes.json();
      const rows = allData.values || [];
      const existingRowIndex = rows.findIndex((r: string[]) => r[0] === orderData.order_number);

      const row = orderToRow(orderData);

      if (existingRowIndex > 0) {
        // Update existing row
        const rowNum = existingRowIndex + 1;
        await fetch(
          `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A${rowNum}:S${rowNum}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [row] }),
          }
        );
      } else {
        // Append new row
        await fetch(
          `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:S:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [row] }),
          }
        );
      }

      // Update last synced
      await supabase
        .from('google_sheets_settings')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', settings.id);

      return new Response(JSON.stringify({ success: true, synced: 1 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync-bulk') {
      let ordersList = orders;
      if (!ordersList) {
        const { data: allOrders } = await supabase
          .from('orders')
          .select('*, customers(company_name, business_name)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5000);
        ordersList = (allOrders || []).map((o: any) => ({
          ...o,
          company_name: o.customers?.company_name,
          business_name: o.customers?.business_name,
        }));
      }

      // Clear sheet and write header + all data
      const allRows = [HEADER_ROW, ...ordersList.map(orderToRow)];

      // Clear existing data
      await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:S:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        }
      );

      // Write all data
      await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: allRows }),
        }
      );

      await supabase
        .from('google_sheets_settings')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', settings.id);

      return new Response(JSON.stringify({ success: true, synced: ordersList.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
