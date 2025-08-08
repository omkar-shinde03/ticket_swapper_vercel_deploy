import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

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

    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      ticketId 
    } = await req.json();

    // Verify Razorpay signature
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret not configured");
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('enhanced_transactions')
      .select('*, tickets(*)')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('buyer_id', user.id)
      .single();

    if (transactionError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Update transaction as completed - payment received in main account
    const { error: updateError } = await supabaseClient
      .from('enhanced_transactions')
      .update({
        status: 'completed',
        payment_status: 'received',
        razorpay_payment_id: razorpay_payment_id,
        completed_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      throw new Error("Failed to update transaction");
    }

    // Mark ticket as sold
    await supabaseClient
      .from('tickets')
      .update({ 
        status: 'sold',
        buyer_id: user.id,
        sold_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    // Queue seller payout for processing
    // This will be processed by admin or automated payout system
    await supabaseClient
      .from('seller_payouts')
      .insert({
        transaction_id: transaction.id,
        seller_id: transaction.seller_id,
        amount: transaction.amount - transaction.platform_fee,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    // Send success notification to seller
    await supabaseClient.functions.invoke('send-notification', {
      body: {
        userId: transaction.seller_id,
        title: 'Ticket Sold!',
        message: `Your ticket has been sold. You'll receive ₹${transaction.amount - transaction.platform_fee} in your account within 24 hours.`,
        type: 'sale_completed'
      }
    });

    // Send confirmation to buyer
    await supabaseClient.functions.invoke('send-notification', {
      body: {
        userId: user.id,
        title: 'Purchase Successful!',
        message: `Your ticket purchase is confirmed. Check your email for ticket details.`,
        type: 'purchase_confirmed'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        paymentId: razorpay_payment_id,
        ticket: transaction.tickets
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
