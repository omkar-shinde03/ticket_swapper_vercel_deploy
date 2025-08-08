
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
 * @typedef {Object} UserManagementProps
 * @property {Profile[]} users
 */

export const UserManagement = ({ users }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const totalUsers = users.filter(user => user.user_type !== 'admin').length;
  const verifiedUsers = users.filter(user => user.kyc_status === 'verified' && user.user_type !== 'admin').length;
  const pendingUsers = users.filter(user => user.kyc_status === 'pending' && user.user_type !== 'admin').length;

  const loadUserDetails = async (user) => {
    setIsLoading(true);
    setSelectedUser(user);
    
    try {
      // Load user documents
      const { data: documents, error: docsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id);

      if (docsError) {
        console.error('Error loading documents:', docsError);
      } else {
        setUserDocuments(documents || []);
      }

      // Load user tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('seller_id', user.id);

      if (ticketsError) {
        console.error('Error loading tickets:', ticketsError);
      } else {
        setUserTickets(tickets || []);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast({
        title: "Error",
        description: "Failed to load user details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = async (documentUrl, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(documentUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({totalUsers})</CardTitle>
          <CardDescription>Complete user management and document access</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(user => user.user_type !== 'admin').map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>{user.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">User</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        user.kyc_status === 'verified' 
                          ? 'text-green-700 bg-green-100' 
                          : user.kyc_status === 'rejected'
                          ? 'text-red-700 bg-red-100'
                          : 'text-yellow-700 bg-yellow-100'
                      }
                    >
                      {user.kyc_status === 'verified' ? 'Verified' : 
                       user.kyc_status === 'rejected' ? 'Rejected' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => loadUserDetails(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>User Details: {selectedUser?.full_name || 'Unknown'}</DialogTitle>
                          <DialogDescription>
                            Complete user information, documents, and activity
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedUser && (
                          <div className="space-y-6">
                            {/* User Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Full Name</label>
                                <p className="text-sm text-muted-foreground">{selectedUser.full_name || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Email</label>
                                <p className="text-sm text-muted-foreground">{selectedUser.email || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Phone</label>
                                <p className="text-sm text-muted-foreground">{selectedUser.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">KYC Status</label>
                                <p className="text-sm text-muted-foreground">{selectedUser.kyc_status}</p>
                              </div>
                            </div>

                            {/* Documents Section */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3">KYC Documents</h3>
                              {isLoading ? (
                                <p className="text-sm text-muted-foreground">Loading documents...</p>
                              ) : userDocuments.length > 0 ? (
                                <div className="space-y-2">
                                  {userDocuments.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <FileText className="h-4 w-4" />
                                        <div>
                                          <p className="text-sm font-medium">{doc.document_type}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Uploaded {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(doc.document_url, '_blank')}
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadDocument(doc.document_url, `${doc.document_type}_${selectedUser.full_name}`)}
                                        >
                                          <Download className="h-4 w-4 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No documents uploaded</p>
                              )}
                            </div>

                            {/* Tickets Section */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Ticket Activity ({userTickets.length})</h3>
                              {userTickets.length > 0 ? (
                                <div className="space-y-2">
                                  {userTickets.slice(0, 5).map((ticket) => (
                                    <div key={ticket.id} className="p-3 border rounded-lg">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="text-sm font-medium">{ticket.pnr_number}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {ticket.from_location} → {ticket.to_location}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            ₹{ticket.selling_price} • {ticket.status}
                                          </p>
                                        </div>
                                        <Badge variant={ticket.status === 'available' ? 'default' : 'secondary'}>
                                          {ticket.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                  {userTickets.length > 5 && (
                                    <p className="text-xs text-muted-foreground">
                                      And {userTickets.length - 5} more tickets...
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No tickets listed</p>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
