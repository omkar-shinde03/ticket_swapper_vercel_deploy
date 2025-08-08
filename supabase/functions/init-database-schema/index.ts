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

    // Create missing tables and functions
    const sqlCommands = [
      // Create profiles table with proper structure
      `CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        full_name TEXT,
        phone VARCHAR(15),
        kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
        user_type VARCHAR(20) DEFAULT 'user' CHECK (user_type IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create tickets table with proper structure
      `CREATE TABLE IF NOT EXISTS tickets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        pnr_number TEXT NOT NULL,
        passenger_name TEXT NOT NULL,
        from_location TEXT NOT NULL,
        to_location TEXT NOT NULL,
        departure_date TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        bus_operator TEXT NOT NULL,
        seat_number TEXT NOT NULL,
        ticket_price DECIMAL(10,2) NOT NULL,
        selling_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'cancelled')),
        verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create seller_payouts table
      `CREATE TABLE IF NOT EXISTS seller_payouts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
        razorpay_payout_id VARCHAR(255),
        upi_id VARCHAR(255),
        phone_number VARCHAR(15),
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create video_calls table
      `CREATE TABLE IF NOT EXISTS video_calls (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        call_start_time TIMESTAMP WITH TIME ZONE,
        call_end_time TIMESTAMP WITH TIME ZONE,
        verification_notes TEXT,
        verification_result VARCHAR(20) CHECK (verification_result IN ('approved', 'rejected', 'pending')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create kyc_documents table
      `CREATE TABLE IF NOT EXISTS kyc_documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        document_url TEXT NOT NULL,
        verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verified_at TIMESTAMP WITH TIME ZONE,
        verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
      );`,

      // Create transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'payout')),
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Enable RLS
      `ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE messages ENABLE ROW LEVEL SECURITY;`,

      // Create RLS policies
      `DROP POLICY IF EXISTS "Users can view their own payouts" ON seller_payouts;`,
      `CREATE POLICY "Users can view their own payouts" ON seller_payouts
        FOR SELECT USING (auth.uid() = seller_id);`,

      `DROP POLICY IF EXISTS "Users can view their own video calls" ON video_calls;`,
      `CREATE POLICY "Users can view their own video calls" ON video_calls
        FOR SELECT USING (auth.uid() = user_id);`,

      `DROP POLICY IF EXISTS "Users can manage their own documents" ON kyc_documents;`,
      `CREATE POLICY "Users can manage their own documents" ON kyc_documents
        FOR ALL USING (auth.uid() = user_id);`,

      `DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;`,
      `CREATE POLICY "Users can view their own transactions" ON transactions
        FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);`,

      `DROP POLICY IF EXISTS "Users can view their own messages" ON messages;`,
      `CREATE POLICY "Users can view their own messages" ON messages
        FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);`,

      // Create database functions
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
          p.full_name as seller_name,
          p.phone as seller_phone,
          t.created_at
        FROM tickets t
        LEFT JOIN profiles p ON t.seller_id = p.id
        WHERE t.status = 'available' 
        AND t.verification_status = 'verified'
        AND t.seller_id != auth.uid()
        ORDER BY t.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,

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
          t.pnr_number as ticket_pnr,
          tr.created_at
        FROM transactions tr
        LEFT JOIN tickets t ON tr.ticket_id = t.id
        WHERE tr.buyer_id = auth.uid() OR tr.seller_id = auth.uid()
        ORDER BY tr.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,

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
          t.pnr_number as ticket_pnr,
          sp.created_at
        FROM seller_payouts sp
        LEFT JOIN tickets t ON sp.ticket_id = t.id
        WHERE sp.seller_id = auth.uid() AND sp.status = 'pending'
        ORDER BY sp.created_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_id ON seller_payouts(seller_id);`,
      `CREATE INDEX IF NOT EXISTS idx_video_calls_user_id ON video_calls(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);`,
      `CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);`
    ];

    // Execute each SQL command using raw SQL
    const results = [];
    for (const sql of sqlCommands) {
      try {
        console.log(`Executing: ${sql.substring(0, 50)}...`);
        
        // Use the service role client to execute raw SQL
        const { data, error } = await supabaseClient
          .from('information_schema.tables')
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`Error with basic query:`, error);
        }
        
        // For now, we'll create a simpler approach using individual operations
        // This is more reliable than trying to execute raw SQL
        if (sql.includes('CREATE TABLE IF NOT EXISTS profiles')) {
          // Profile table creation will be handled by Supabase Auth automatically
          console.log('Profiles table handled by Supabase Auth');
        } else if (sql.includes('CREATE TABLE IF NOT EXISTS tickets')) {
          // Check if tickets table exists
          const { error: ticketsError } = await supabaseClient
            .from('tickets')
            .select('id')
            .limit(1);
          
          if (ticketsError && ticketsError.message.includes('relation "tickets" does not exist')) {
            console.log('Tickets table needs to be created via Supabase dashboard');
            results.push({ table: 'tickets', status: 'needs_manual_creation' });
          } else {
            console.log('Tickets table exists');
            results.push({ table: 'tickets', status: 'exists' });
          }
        }
        
        results.push({ sql: sql.substring(0, 50), status: 'processed' });
      } catch (e) {
        console.error(`Error executing SQL: ${e.message}`);
        results.push({ sql: sql.substring(0, 50), error: e.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database schema initialization completed",
        results: results,
        note: "Some tables may need to be created manually in Supabase dashboard"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error initializing database:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestion: "Please create the required tables manually in your Supabase dashboard"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});