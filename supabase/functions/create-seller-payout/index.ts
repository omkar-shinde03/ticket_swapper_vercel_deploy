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

    const { payoutId, upiId, phoneNumber } = await req.json();
    
    if (!payoutId || (!upiId && !phoneNumber)) {
      throw new Error("Missing required fields: payoutId and (upiId or phoneNumber)");
    }

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('seller_payouts')
      .select('*')
      .eq('id', payoutId)
      .eq('seller_id', user.id)
      .eq('status', 'pending')
      .single();

    if (payoutError || !payout) {
      throw new Error("Payout not found or already processed");
    }

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    // Create payout via Razorpay Payouts API
    const payoutData = {
      account_number: "2323230099089860", // Your business account number
      amount: payout.amount * 100, // Convert to paise
      currency: "INR",
      mode: "UPI",
      purpose: "refund",
      fund_account: {
        account_type: "vpa",
        vpa: {
          address: upiId || `${phoneNumber}@paytm` // Default to paytm if only phone provided
        }
      },
      queue_if_low_balance: true,
      reference_id: `payout_${payoutId}_${Date.now()}`,
      narration: "Bus ticket sale payment"
    };

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payoutData),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      throw new Error(`Razorpay Payout API error: ${errorData}`);
    }

    const payoutResult = await razorpayResponse.json();

    // Update payout status
    const { error: updateError } = await supabaseClient
      .from('seller_payouts')
      .update({
        status: 'processed',
        razorpay_payout_id: payoutResult.id,
        processed_at: new Date().toISOString(),
        upi_id: upiId,
        phone_number: phoneNumber
      })
      .eq('id', payoutId);

    if (updateError) {
      throw new Error("Failed to update payout status");
    }

    // Send success notification
    await supabaseClient.functions.invoke('send-notification', {
      body: {
        userId: user.id,
        title: 'Payment Sent!',
        message: `₹${payout.amount} has been sent to your UPI. It may take 1-2 hours to reflect.`,
        type: 'payout_sent'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        payoutId: payoutResult.id,
        amount: payout.amount,
        status: payoutResult.status
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error creating payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});