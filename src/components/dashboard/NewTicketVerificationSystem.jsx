import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Plus } from 'lucide-react';
import { TicketVerificationForm } from './TicketVerificationForm';
import { VerifiedTicketListing } from './VerifiedTicketListing';

const STEPS = {
  CHOOSE_METHOD: 'choose_method',
  VERIFY_TICKET: 'verify_ticket',
  LIST_TICKET: 'list_ticket',
  COMPLETE: 'complete'
};

export const NewTicketVerificationSystem = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.CHOOSE_METHOD);
  const [verifiedTicketData, setVerifiedTicketData] = useState(null);

  const handleVerificationComplete = (ticketData) => {
    setVerifiedTicketData(ticketData);
    setCurrentStep(STEPS.LIST_TICKET);
  };

  const handleListingComplete = (listedTicket) => {
    setCurrentStep(STEPS.COMPLETE);
    if (onComplete) {
      onComplete(listedTicket);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case STEPS.VERIFY_TICKET:
        setCurrentStep(STEPS.CHOOSE_METHOD);
        break;
      case STEPS.LIST_TICKET:
        setCurrentStep(STEPS.VERIFY_TICKET);
        setVerifiedTicketData(null);
        break;
      default:
        break;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.CHOOSE_METHOD:
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <span>Add New Ticket</span>
              </CardTitle>
              <CardDescription>
                Choose how you want to add your ticket for sale
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* API Verification Option */}
              <div 
                className="border-2 border-green-200 rounded-lg p-6 hover:border-green-300 cursor-pointer transition-colors bg-green-50"
                onClick={() => setCurrentStep(STEPS.VERIFY_TICKET)}
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Verify Ticket with API (Recommended)
                    </h3>
                    <p className="text-sm text-green-700 mb-3">
                      Instantly verify your ticket against our secure database. Your ticket will be marked as verified and gain buyer trust.
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-green-600">
                      <span className="flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        100% Secure
                      </span>
                      <span>✓ Instant Verification</span>
                      <span>✓ Higher Buyer Confidence</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Entry Option */}
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 opacity-60">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Plus className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-400 mb-2">
                      Manual Entry (Coming Soon)
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Manually enter ticket details. Requires additional verification steps.
                    </p>
                    <div className="text-xs text-gray-400">
                      Feature under development
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Why verify your ticket?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Verified tickets sell 3x faster</li>
                  <li>• Buyers trust API-verified tickets more</li>
                  <li>• Get priority placement in search results</li>
                  <li>• Protection against fraud claims</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );

      case STEPS.VERIFY_TICKET:
        return (
          <TicketVerificationForm onVerificationComplete={handleVerificationComplete} />
        );

      case STEPS.LIST_TICKET:
        return (
          <VerifiedTicketListing 
            verifiedTicketData={verifiedTicketData}
            onListingComplete={handleListingComplete}
          />
        );

      case STEPS.COMPLETE:
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ticket Listed Successfully! 🎉
              </h3>
              <p className="text-gray-600 mb-6">
                Your verified ticket is now available for buyers to purchase.
              </p>
              <Button onClick={() => window.location.reload()}>
                View Your Listings
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {currentStep !== STEPS.CHOOSE_METHOD && currentStep !== STEPS.COMPLETE && (
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      )}

      {/* Step Indicator */}
      {currentStep !== STEPS.COMPLETE && (
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${
            currentStep === STEPS.CHOOSE_METHOD ? 'bg-blue-600' : 'bg-gray-300'
          }`} />
          <div className="w-8 h-px bg-gray-300" />
          <div className={`w-3 h-3 rounded-full ${
            currentStep === STEPS.VERIFY_TICKET ? 'bg-blue-600' : 'bg-gray-300'
          }`} />
          <div className="w-8 h-px bg-gray-300" />
          <div className={`w-3 h-3 rounded-full ${
            currentStep === STEPS.LIST_TICKET ? 'bg-blue-600' : 'bg-gray-300'
          }`} />
        </div>
      )}

      {/* Step Content */}
      {renderStepContent()}
    </div>
  );
};