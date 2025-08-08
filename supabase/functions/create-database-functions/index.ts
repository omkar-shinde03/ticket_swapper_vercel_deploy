import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create all missing database functions
    const functions = [
      // Function 1: get_available_tickets
      `CREATE OR REPLACE FUNCTION get_available_tickets()
      RETURNS TABLE (
        id UUID,
        pnr_number TEXT,
        passenger_name TEXT,
        from_location TEXT,
        to_location TEXT,
        departure_date TEXT,
        departure_time TEXT,
        bus_operator TEXT,
        seat_number TEXT,
        ticket_price DECIMAL,
        selling_price DECIMAL,
        status TEXT,
        verification_status TEXT,
        seller_name TEXT,
        seller_phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          t.id,
          t.pnr_number,
          t.passenger_name,
          t.from_location,
          t.to_location,
          t.departure_date,
          t.departure_time,
          t.bus_operator,
          t.seat_number,
          t.ticket_price,
          t.selling_price,
          t.status,
          t.verification_status,
          COALESCE(p.full_name, 'Anonymous') as seller_name,
          COALESCE(p.phone, '') as seller_phone,
          t.created_at
        FROM tickets t
        LEFT JOIN profiles p ON t.seller_id = p.id
        WHERE t.status = 'available' 
        AND t.verification_status = 'verified'
        ORDER BY t.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,

      // Function 2: get_user_tickets  
      `CREATE OR REPLACE FUNCTION get_user_tickets()
      RETURNS TABLE (
        id UUID,
        pnr_number TEXT,
        passenger_name TEXT,
        from_location TEXT,
        to_location TEXT,
        departure_date TEXT,
        departure_time TEXT,
        bus_operator TEXT,
        seat_number TEXT,
        ticket_price DECIMAL,
        selling_price DECIMAL,
        status TEXT,
        verification_status TEXT,
        created_at TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          t.id,
          t.pnr_number,
          t.passenger_name,
          t.from_location,
          t.to_location,
          t.departure_date,
          t.departure_time,
          t.bus_operator,
          t.seat_number,
          t.ticket_price,
          t.selling_price,
          t.status,
          t.verification_status,
          t.created_at
        FROM tickets t
        WHERE t.seller_id = auth.uid()
        ORDER BY t.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,

      // Function 3: get_user_transactions
      `CREATE OR REPLACE FUNCTION get_user_transactions()
      RETURNS TABLE (
        id UUID,
        amount DECIMAL,
        transaction_type TEXT,
        status TEXT,
        ticket_pnr TEXT,
        created_at TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          tr.id,
          tr.amount,
          tr.transaction_type,
          tr.status,
          COALESCE(t.pnr_number, '') as ticket_pnr,
          tr.created_at
        FROM transactions tr
        LEFT JOIN tickets t ON tr.ticket_id = t.id
        WHERE tr.buyer_id = auth.uid() OR tr.seller_id = auth.uid()
        ORDER BY tr.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,

      // Function 4: get_pending_payouts
      `CREATE OR REPLACE FUNCTION get_pending_payouts()
      RETURNS TABLE (
        id UUID,
        amount DECIMAL,
        ticket_pnr TEXT,
        created_at TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          sp.id,
          sp.amount,
          COALESCE(t.pnr_number, '') as ticket_pnr,
          sp.created_at
        FROM seller_payouts sp
        LEFT JOIN tickets t ON sp.ticket_id = t.id
        WHERE sp.seller_id = auth.uid() AND sp.status = 'pending'
        ORDER BY sp.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`
    ];

    const results = [];
    
    // Execute each function creation
    for (const functionSql of functions) {
      try {
        console.log(`Creating function: ${functionSql.substring(0, 50)}...`);
        
        // Use the raw SQL execution approach for functions
        const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            'apikey': Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          },
          body: JSON.stringify({ sql: functionSql })
        });

        if (response.ok) {
          results.push({ function: functionSql.match(/FUNCTION (\w+)/)?.[1], status: 'created' });
        } else {
          const error = await response.text();
          console.error(`Function creation failed: ${error}`);
          results.push({ function: functionSql.match(/FUNCTION (\w+)/)?.[1], status: 'failed', error });
        }
      } catch (error) {
        console.error(`Error creating function: ${error.message}`);
        results.push({ function: 'unknown', status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database functions creation completed",
        results: results,
        instructions: "If any functions failed, please run the SQL manually in Supabase SQL Editor"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating database functions:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        solution: "Please run the function creation SQL manually in your Supabase SQL Editor"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});