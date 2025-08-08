import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string|null} full_name
 * @property {string|null} phone
 * @property {string} user_type
 * @property {string} kyc_status
 */

/**
 * @typedef {Object} UserProfileProps
 * @property {Profile|null} profile
 * @property {any} user
 */

export const UserProfile = ({ profile, user }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your account and verification status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={profile?.full_name || ""}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={user?.email || ""}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={profile?.phone || ""}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>User Type</Label>
            <Badge variant="outline" className="w-fit">
              {profile?.user_type === 'admin' ? 'Admin' : 'User'}
            </Badge>
          </div>
          <div>
            <Label>KYC Status</Label>
            <Badge 
              variant="outline" 
              className={`w-fit ${
                profile?.kyc_status === 'verified' 
                  ? 'text-green-700 bg-green-100' 
                  : 'text-yellow-700 bg-yellow-100'
              }`}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              {profile?.kyc_status === 'verified' ? 'Verified' : 'Pending Verification'}
            </Badge>
          </div>
        </div>
        
        {profile?.kyc_status !== 'verified' && (
          <div className="border rounded-lg p-4 bg-yellow-50">
            <h4 className="font-medium text-yellow-800 mb-2">KYC Verification Required</h4>
            <p className="text-sm text-yellow-700 mb-3">
              Complete your KYC verification with Aadhaar to start buying and selling tickets.
            </p>
            <Button variant="outline" className="border-yellow-300 text-yellow-700">
              Start KYC Process
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};