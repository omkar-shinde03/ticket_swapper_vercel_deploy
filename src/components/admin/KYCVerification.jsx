
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string|null} full_name
 * @property {string|null} phone
 * @property {string} user_type
 * @property {string} kyc_status
 * @property {string} created_at
 */

/**
 * @typedef {Object} KYCVerificationProps
 * @property {Profile[]} users
 * @property {Function} onUpdate
 */

export const KYCVerification = ({ users, onUpdate }) => {
  const [loading, setLoading] = useState(null);
  const { toast } = useToast();

  const pendingUsers = users.filter(user => user.kyc_status === 'pending' && user.user_type !== 'admin');

  const handleKYCAction = async (userId, action) => {
    setLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: action })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: `KYC ${action}`,
        description: `User KYC has been ${action} successfully.`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "KYC action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Verification</CardTitle>
        <CardDescription>Review and approve pending KYC verifications</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending KYC verifications
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-yellow-700 bg-yellow-100">
                      Pending Verification
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleKYCAction(user.id, 'verified')}
                        disabled={loading === user.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleKYCAction(user.id, 'rejected')}
                        disabled={loading === user.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
