import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketApiClient } from '@/utils/ticketApiClient';

export const TicketVerificationForm = ({ onVerificationComplete }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [formData, setFormData] = useState({
    pnrNumber: '',
    passengerName: '',
    busOperator: ''
  });
  
  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear previous verification result when user types
    if (verificationResult) {
      setVerificationResult(null);
    }
  };

  const handleVerifyTicket = async () => {
    if (!formData.pnrNumber || !formData.passengerName || !formData.busOperator) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const result = await TicketApiClient.verifyTicket(
        formData.pnrNumber,
        formData.passengerName,
        formData.busOperator
      );

      setVerificationResult(result);

      if (result.verified) {
        toast({
          title: 'Ticket Verified! ✅',
          description: 'Your ticket has been successfully verified against our database.',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: result.error || 'Ticket could not be verified',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: 'Failed to verify ticket. Please try again.',
        variant: 'destructive'
      });
      setVerificationResult({
        verified: false,
        error: 'Network error during verification'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceedToListing = () => {
    if (verificationResult?.verified && onVerificationComplete) {
      onVerificationComplete({
        ...verificationResult.ticketData,
        verificationStatus: 'verified',
        verificationMethod: 'api_validation'
      });
    }
  };

  const getVerificationStatusBadge = () => {
    if (!verificationResult) return null;

    if (verificationResult.verified) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Not Verified
        </Badge>
      );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span>Ticket Verification</span>
        </CardTitle>
        <CardDescription>
          Enter your ticket details to verify against our secure database
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Verification Form */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pnrNumber">PNR Number *</Label>
            <Input
              id="pnrNumber"
              placeholder="Enter your PNR number"
              value={formData.pnrNumber}
              onChange={(e) => handleInputChange('pnrNumber', e.target.value)}
              disabled={isVerifying}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passengerName">Passenger Name *</Label>
            <Input
              id="passengerName"
              placeholder="Enter passenger name (as on ticket)"
              value={formData.passengerName}
              onChange={(e) => handleInputChange('passengerName', e.target.value)}
              disabled={isVerifying}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="busOperator">Bus Operator *</Label>
            <Input
              id="busOperator"
              placeholder="Enter bus operator name"
              value={formData.busOperator}
              onChange={(e) => handleInputChange('busOperator', e.target.value)}
              disabled={isVerifying}
            />
          </div>
        </div>

        {/* Verification Button */}
        <Button 
          onClick={handleVerifyTicket}
          disabled={isVerifying || !formData.pnrNumber || !formData.passengerName || !formData.busOperator}
          className="w-full"
          size="lg"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying Ticket...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Verify Ticket
            </>
          )}
        </Button>

        {/* Verification Result */}
        {verificationResult && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Verification Result</h3>
              {getVerificationStatusBadge()}
            </div>

            {verificationResult.verified ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-green-700 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Ticket Verified Successfully</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Your ticket details have been confirmed in our database.
                  </p>
                </div>

                {/* Verified Ticket Details */}
                {verificationResult.ticketData && (
                  <div className="bg-white border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-gray-900">Verified Ticket Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Route:</span>
                        <span className="ml-2 font-medium">
                          {verificationResult.ticketData.from_location} → {verificationResult.ticketData.to_location}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 font-medium">{verificationResult.ticketData.departure_date}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <span className="ml-2 font-medium">{verificationResult.ticketData.departure_time}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Seat:</span>
                        <span className="ml-2 font-medium">{verificationResult.ticketData.seat_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-2 font-medium">₹{verificationResult.ticketData.ticket_price}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proceed Button */}
                <Button 
                  onClick={handleProceedToListing}
                  className="w-full"
                  variant="default"
                >
                  List This Verified Ticket for Sale
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-red-700 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Verification Failed</span>
                </div>
                <p className="text-sm text-red-600">
                  {verificationResult.error || 'The provided ticket details could not be verified.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Secure Verification Process</p>
              <p className="text-blue-700">
                We verify your ticket against official bus operator databases to ensure authenticity and prevent fraud.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};