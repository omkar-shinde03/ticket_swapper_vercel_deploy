import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, DollarSign, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const VerifiedTicketListing = ({ verifiedTicketData, onListingComplete }) => {
  const [sellingPrice, setSellingPrice] = useState('');
  const [isListing, setIsListing] = useState(false);
  const { toast } = useToast();

  const handleListTicket = async () => {
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Please enter a valid selling price',
        variant: 'destructive'
      });
      return;
    }

    if (parseFloat(sellingPrice) > parseFloat(verifiedTicketData.ticket_price)) {
      toast({
        title: 'Price Too High',
        description: 'Selling price cannot be higher than original ticket price',
        variant: 'destructive'
      });
      return;
    }

    setIsListing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create verified ticket listing
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          seller_id: user.id,
          pnr_number: verifiedTicketData.pnr_number,
          bus_operator: verifiedTicketData.bus_operator,
          departure_date: verifiedTicketData.departure_date,
          departure_time: verifiedTicketData.departure_time,
          from_location: verifiedTicketData.from_location,
          to_location: verifiedTicketData.to_location,
          passenger_name: verifiedTicketData.passenger_name,
          seat_number: verifiedTicketData.seat_number,
          ticket_price: parseFloat(verifiedTicketData.ticket_price),
          selling_price: parseFloat(sellingPrice),
          status: 'available',
          verification_status: 'verified', // Mark as verified
          api_verified: true,
          api_provider: 'ticekt-demo-api',
          verification_confidence: 100,
          verified_at: new Date().toISOString()
        })
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: 'Ticket Listed Successfully! 🎉',
        description: 'Your verified ticket is now available for sale.',
      });

      if (onListingComplete) {
        onListingComplete(data[0]);
      }
    } catch (error) {
      console.error('Error listing ticket:', error);
      toast({
        title: 'Listing Failed',
        description: error.message || 'Failed to list ticket. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsListing(false);
    }
  };

  const discountPercentage = verifiedTicketData.ticket_price 
    ? Math.round(((parseFloat(verifiedTicketData.ticket_price) - parseFloat(sellingPrice || 0)) / parseFloat(verifiedTicketData.ticket_price)) * 100)
    : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>List Verified Ticket</span>
        </CardTitle>
        <CardDescription>
          Set your selling price and list your verified ticket for sale
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Verification Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-green-600" />
            <Badge className="bg-green-100 text-green-800 border-green-200">
              API Verified
            </Badge>
          </div>
          <p className="text-sm text-green-700">
            This ticket has been verified against the official bus operator database.
          </p>
        </div>

        {/* Ticket Details Summary */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Ticket Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">PNR:</span>
              <span className="ml-2 font-medium">{verifiedTicketData.pnr_number}</span>
            </div>
            <div>
              <span className="text-gray-500">Passenger:</span>
              <span className="ml-2 font-medium">{verifiedTicketData.passenger_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Route:</span>
              <span className="ml-2 font-medium">
                {verifiedTicketData.from_location} → {verifiedTicketData.to_location}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Operator:</span>
              <span className="ml-2 font-medium">{verifiedTicketData.bus_operator}</span>
            </div>
            <div>
              <span className="text-gray-500">Date & Time:</span>
              <span className="ml-2 font-medium">
                {verifiedTicketData.departure_date} at {verifiedTicketData.departure_time}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Seat:</span>
              <span className="ml-2 font-medium">{verifiedTicketData.seat_number}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Original Price:</span>
              <span className="ml-2 font-bold text-green-600">₹{verifiedTicketData.ticket_price}</span>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sellingPrice" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Set Your Selling Price *</span>
            </Label>
            <Input
              id="sellingPrice"
              type="number"
              placeholder="Enter selling price"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              disabled={isListing}
              max={verifiedTicketData.ticket_price}
              min="1"
            />
            <p className="text-xs text-gray-500">
              Maximum allowed: ₹{verifiedTicketData.ticket_price} (original price)
            </p>
          </div>

          {/* Price Analysis */}
          {sellingPrice && parseFloat(sellingPrice) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Price Analysis</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Your selling price:</span>
                  <span className="font-medium text-blue-900">₹{sellingPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Discount offered:</span>
                  <span className="font-medium text-blue-900">
                    {discountPercentage > 0 ? `${discountPercentage}%` : '0%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Savings for buyer:</span>
                  <span className="font-medium text-green-600">
                    ₹{Math.max(0, parseFloat(verifiedTicketData.ticket_price) - parseFloat(sellingPrice))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* List Button */}
        <Button 
          onClick={handleListTicket}
          disabled={isListing || !sellingPrice || parseFloat(sellingPrice) <= 0}
          className="w-full"
          size="lg"
        >
          {isListing ? 'Listing Ticket...' : 'List Verified Ticket for Sale'}
        </Button>

        {/* Terms */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">By listing this ticket, you agree that:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>The ticket information is accurate and verified</li>
            <li>You will transfer the ticket promptly upon sale</li>
            <li>Platform fees may apply to the transaction</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};