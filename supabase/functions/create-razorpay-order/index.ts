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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { ticketId, amount, sellerAmount, platformCommission } = await req.json();
    
    if (!ticketId || !amount) {
      throw new Error("Missing required fields: ticketId, amount");
    }

    // Get ticket details and verify availability
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('*, seller_id')
      .eq('id', ticketId)
      .eq('status', 'available')
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found or not available");
    }

    if (ticket.seller_id === user.id) {
      throw new Error("Cannot purchase your own ticket");
    }

    // Get Razorpay credentials from secrets
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    // Create Razorpay order - all payments go to main account
    const orderData = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `ticket_${ticketId}_${Date.now()}`,
      notes: {
        ticket_id: ticketId,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        type: 'ticket_purchase'
      }
    };

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      throw new Error(`Razorpay API error: ${errorData}`);
    }

    const order = await razorpayResponse.json();

    // Create transaction record in database
    const { error: transactionError } = await supabaseClient
      .from('enhanced_transactions')
      .insert({
        ticket_id: ticketId,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        amount: amount,
        platform_fee: platformCommission,
        razorpay_order_id: order.id,
        status: 'pending',
        escrow_status: 'held'
      });

    if (transactionError) {
      throw new Error("Failed to create transaction record");
    }

    // Mark ticket as pending purchase
    await supabaseClient
      .from('tickets')
      .update({ status: 'pending_purchase' })
      .eq('id', ticketId);

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: razorpayKeyId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});