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

    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      throw new Error("Missing payment intent ID");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error("Payment not successful");
    }

    const { ticketId, buyerId, sellerId } = paymentIntent.metadata;

    // Update transaction status
    const { error: transactionError } = await supabaseClient
      .from('enhanced_transactions')
      .update({
        status: 'completed',
        escrow_status: 'released',
        completion_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntentId);

    if (transactionError) {
      throw new Error("Failed to update transaction");
    }

    // Update ticket status to sold
    await supabaseClient
      .from('tickets')
      .update({ 
        status: 'sold',
        buyer_id: buyerId,
        sold_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    // Update user transaction counts
    await supabaseClient
      .from('user_profiles')
      .upsert([
        { 
          user_id: buyerId, 
          successful_purchases: supabaseClient.from('user_profiles').select('successful_purchases').eq('user_id', buyerId).single().then(r => (r.data?.successful_purchases || 0) + 1),
          total_transactions: supabaseClient.from('user_profiles').select('total_transactions').eq('user_id', buyerId).single().then(r => (r.data?.total_transactions || 0) + 1),
          updated_at: new Date().toISOString()
        },
        { 
          user_id: sellerId, 
          successful_sales: supabaseClient.from('user_profiles').select('successful_sales').eq('user_id', sellerId).single().then(r => (r.data?.successful_sales || 0) + 1),
          total_transactions: supabaseClient.from('user_profiles').select('total_transactions').eq('user_id', sellerId).single().then(r => (r.data?.total_transactions || 0) + 1),
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'user_id' });

    // Create notifications
    await supabaseClient
      .from('notifications')
      .insert([
        {
          user_id: buyerId,
          title: 'Payment Successful',
          message: 'Your ticket purchase has been confirmed. Check your transaction history for details.',
          type: 'success',
          category: 'transaction'
        },
        {
          user_id: sellerId,
          title: 'Ticket Sold',
          message: 'Your ticket has been sold successfully. Payment has been processed.',
          type: 'success',
          category: 'transaction'
        }
      ]);

    return new Response(
      JSON.stringify({ success: true, message: "Payment confirmed successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error confirming payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});