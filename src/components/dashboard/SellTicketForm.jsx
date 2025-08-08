import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { NewTicketVerificationSystem } from "./NewTicketVerificationSystem";
import EmailVerificationGuard from "./EmailVerificationGuard";

export const SellTicketForm = ({ user, onTicketAdded }) => {
  const [showVerificationSystem, setShowVerificationSystem] = useState(false);

  const handleNewTicketClick = () => {
    setShowVerificationSystem(true);
  };

  const handleVerificationComplete = (ticket) => {
    setShowVerificationSystem(false);
    if (onTicketAdded) {
      onTicketAdded(ticket);
    }
  };

  if (showVerificationSystem) {
    return (
      <EmailVerificationGuard requiredFor="sell tickets">
        <NewTicketVerificationSystem 
          onComplete={handleVerificationComplete}
        />
      </EmailVerificationGuard>
    );
  }

  return (
    <EmailVerificationGuard requiredFor="sell tickets">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Sell Your Ticket</span>
          </CardTitle>
          <CardDescription>
            List your bus ticket for sale with instant API verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Plus className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to sell your ticket?
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get your ticket verified instantly through our secure API and list it for sale with maximum buyer confidence.
            </p>
            <Button 
              onClick={handleNewTicketClick}
              size="lg"
              className="flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Ticket</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Benefits Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-medium text-green-900">Instant Verification</h4>
              <p className="text-sm text-green-700">API verification in seconds</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🛡️</div>
              <h4 className="font-medium text-blue-900">100% Secure</h4>
              <p className="text-sm text-blue-700">Protected against fraud</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">🚀</div>
              <h4 className="font-medium text-purple-900">Sells Faster</h4>
              <p className="text-sm text-purple-700">Verified tickets sell 3x faster</p>
            </div>
          </div>

          {/* API Info */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔗 API-Powered Verification</h4>
            <p className="text-sm text-blue-700">
              We verify your ticket details against the official database at{" "}
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                ticekt-demo-api.onrender.com
              </code>
            </p>
            <ul className="text-sm text-blue-600 mt-2 space-y-1">
              <li>• Real-time validation of PNR, passenger name, and operator</li>
              <li>• Automatic population of all ticket details</li>
              <li>• Instant "Verified" badge for buyer confidence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </EmailVerificationGuard>
  );
};