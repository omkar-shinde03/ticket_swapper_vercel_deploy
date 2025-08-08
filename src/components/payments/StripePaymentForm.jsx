import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader, CreditCard, Shield } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm = ({ ticket, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            ticketId: ticket.id,
            amount: ticket.selling_price
          }
        }
      );

      if (paymentError) throw paymentError;

      const { clientSecret } = paymentData;

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Confirm payment on backend
      await supabase.functions.invoke('confirm-payment', {
        body: { paymentIntentId: paymentIntent.id }
      });

      toast({
        title: 'Payment Successful!',
        description: 'Your ticket purchase has been confirmed.',
      });

      onSuccess(paymentIntent);
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Secure Payment</span>
        </CardTitle>
        <CardDescription>
          Complete your ticket purchase for ₹{ticket.selling_price}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Details</label>
            <div className="border rounded-md p-3">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span>Your payment is secured by Stripe</span>
          </div>

          <div className="space-y-2">
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Pay ₹${ticket.selling_price}`
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full"
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const StripePaymentForm = ({ ticket, onSuccess, onCancel }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm 
        ticket={ticket} 
        onSuccess={onSuccess} 
        onCancel={onCancel} 
      />
    </Elements>
  );
};