import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const { ticketId, amount } = await req.json();
    
    if (!ticketId || !amount) {
      throw new Error("Missing required fields: ticketId, amount");
    }

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('*, seller_id, selling_price')
      .eq('id', ticketId)
      .eq('status', 'available')
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found or not available");
    }

    if (ticket.seller_id === user.id) {
      throw new Error("Cannot purchase your own ticket");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate platform fee (5% of selling price)
    const platformFee = Math.round(ticket.selling_price * 0.05 * 100); // Convert to cents
    const totalAmount = Math.round(ticket.selling_price * 100); // Convert to cents

    // Create or get Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "inr",
      customer: customerId,
      metadata: {
        ticketId: ticket.id,
        buyerId: user.id,
        sellerId: ticket.seller_id,
        platformFee: platformFee.toString(),
      },
      description: `Bus ticket from ${ticket.from_location} to ${ticket.to_location}`,
    });

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('enhanced_transactions')
      .insert({
        ticket_id: ticketId,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        amount: ticket.selling_price,
        platform_fee: platformFee / 100,
        payment_intent_id: paymentIntent.id,
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
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});