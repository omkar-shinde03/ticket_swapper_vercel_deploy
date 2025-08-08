
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;
        
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;
        
      case "invoice.payment_succeeded":
        await handleSubscriptionPayment(event.data.object);
        break;
        
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(event.data.object);
        break;
        
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
});

async function handlePaymentSuccess(paymentIntent: any) {
  try {
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "completed",
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", paymentIntent.id);

    if (error) throw error;

    // Update ticket status to sold
    const { data: transaction } = await supabase
      .from("transactions")
      .select("ticket_id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (transaction) {
      await supabase
        .from("tickets")
        .update({
          status: "sold",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.ticket_id);
    }

    console.log(`Payment succeeded for payment intent: ${paymentIntent.id}`);
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

async function handlePaymentFailure(paymentIntent: any) {
  try {
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", paymentIntent.id);

    if (error) throw error;

    console.log(`Payment failed for payment intent: ${paymentIntent.id}`);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

async function handleSubscriptionPayment(invoice: any) {
  try {
    const customerId = invoice.customer;
    
    // Get customer email
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer && 'email' in customer && customer.email) {
      const { error } = await supabase
        .from("subscribers")
        .upsert({
          email: customer.email,
          stripe_customer_id: customerId,
          subscribed: true,
          subscription_tier: "Premium",
          subscription_end: new Date(invoice.period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (error) throw error;
    }

    console.log(`Subscription payment succeeded for customer: ${customerId}`);
  } catch (error) {
    console.error("Error handling subscription payment:", error);
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    // Get customer email
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer && 'email' in customer && customer.email) {
      const { error } = await supabase
        .from("subscribers")
        .update({
          subscribed: false,
          subscription_tier: null,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", customer.email);

      if (error) throw error;
    }

    console.log(`Subscription canceled for customer: ${customerId}`);
  } catch (error) {
    console.error("Error handling subscription cancellation:", error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    // Get customer email
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer && 'email' in customer && customer.email) {
      // Determine tier based on price
      let tier = "Basic";
      if (subscription.items.data.length > 0) {
        const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
        const amount = price.unit_amount || 0;
        if (amount <= 999) tier = "Basic";
        else if (amount <= 1999) tier = "Premium";
        else tier = "Enterprise";
      }

      const { error } = await supabase
        .from("subscribers")
        .update({
          subscribed: subscription.status === "active",
          subscription_tier: subscription.status === "active" ? tier : null,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", customer.email);

      if (error) throw error;
    }

    console.log(`Subscription updated for customer: ${customerId}`);
  } catch (error) {
    console.error("Error handling subscription update:", error);
  }
}
