import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

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

async function getValidAccessToken(supabase: any, settings: any): Promise<string> {
  const now = new Date();
  const expiresAt = settings.google_token_expires_at ? new Date(settings.google_token_expires_at) : null;

  // If token is still valid (with 5 min buffer), use it
  if (settings.google_access_token && expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return settings.google_access_token;
  }

  // Token expired or about to expire — refresh it
  if (!settings.google_refresh_token) {
    throw new Error('Google account not connected. Please connect your Google account in Settings.');
  }

  const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: settings.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error('Failed to refresh Google access token. Please reconnect your Google account.');
  }

  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from('google_sheets_settings')
    .update({
      google_access_token: tokenData.access_token,
      google_token_expires_at: newExpiresAt,
    })
    .eq('id', settings.id);

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, orders, order_id, order_number, year, month, sheet_name } = await req.json();

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

    const accessToken = await getValidAccessToken(supabase, settings);
    const spreadsheetId = settings.spreadsheet_id;
    const sheetName = settings.sheet_name || 'Orders';

    if (action === 'test-connection') {
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
        .update({ connection_status: 'connected' })
        .eq('id', settings.id);

      return new Response(JSON.stringify({ success: true, title: data.properties?.title }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync-single') {
      let orderData = orders?.[0];
      if (!orderData && order_id) {
        // Wait 1s for DB transaction to commit (real-time fires early)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const fetchOrder = async () => {
          const { data, error } = await supabase
            .from('orders')
            .select('*, customers!orders_customer_id_fkey(company_name, business_name)')
            .eq('id', order_id)
            .is('deleted_at', null)
            .maybeSingle();
          if (error) console.error('Order fetch error:', error);
          return data;
        };

        let fetchedOrder = await fetchOrder();
        
        // Retry once after another 1s if not found
        if (!fetchedOrder) {
          console.log('Order not found on first attempt, retrying in 1s...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          fetchedOrder = await fetchOrder();
        }

        if (fetchedOrder) {
          orderData = {
            ...fetchedOrder,
            company_name: fetchedOrder.customers?.company_name,
            business_name: fetchedOrder.customers?.business_name,
          };
        }
      }

      if (!orderData) {
        console.error('No order data found for order_id:', order_id);
        throw new Error('No order data provided');
      }

      // Check if header exists
      const headerRes = await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A1:S1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const headerData = await headerRes.json();

      if (!headerData.values || headerData.values.length === 0) {
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
        await fetch(
          `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:S:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [row] }),
          }
        );
      }

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
          .select('*, customers!orders_customer_id_fkey(company_name, business_name)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5000);
        ordersList = (allOrders || []).map((o: any) => ({
          ...o,
          company_name: o.customers?.company_name,
          business_name: o.customers?.business_name,
        }));
      }

      const allRows = [HEADER_ROW, ...ordersList.map(orderToRow)];

      await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:S:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        }
      );

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

    if (action === 'delete-single') {
      if (!order_number) throw new Error('order_number is required for delete-single');
      
      if (!order_number) throw new Error('order_number is required for delete-single');

      // Get sheet ID for batchUpdate
      const sheetMetaRes = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sheetMeta = await sheetMetaRes.json();
      const targetSheet = sheetMeta.sheets?.find((s: any) => s.properties?.title === sheetName);
      const sheetId = targetSheet?.properties?.sheetId ?? 0;

      // Find the row with this order number
      const allRes = await fetch(
        `${SHEETS_API}/${spreadsheetId}/values/${sheetName}!A:A`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const allData = await allRes.json();
      const rows = allData.values || [];
      const rowIndex = rows.findIndex((r: string[]) => r[0] === order_number);

      if (rowIndex <= 0) {
        return new Response(JSON.stringify({ success: true, message: 'Row not found, nothing to delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete the row using batchUpdate
      await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          }],
        }),
      });

      return new Response(JSON.stringify({ success: true, deleted_order: order_number }), {
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
