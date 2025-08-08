import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Download, Search, FileText, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

export const DocumentsManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAllDocuments();
  }, []);

  const loadAllDocuments = async () => {
    try {
      setIsLoading(true);
      
      // Load all documents with user profiles
      const { data, error } = await supabase
        .from('user_documents')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            phone,
            kyc_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        toast({
          title: "Error",
          description: "Failed to load documents.",
          variant: "destructive",
        });
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load documents.",
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
      
      toast({
        title: "Success",
        description: "Document downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document.",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const aadharDocuments = filteredDocuments.filter(doc => 
    doc.document_type?.toLowerCase().includes('aadhar') || 
    doc.document_type?.toLowerCase().includes('aadhaar')
  );

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aadhar Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{aadharDocuments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {documents.filter(doc => doc.profiles?.kyc_status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(doc => doc.profiles?.kyc_status === 'verified').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All User Documents</CardTitle>
          <CardDescription>
            Complete access to all documents uploaded by users including Aadhar cards
          </CardDescription>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by document type, user name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{doc.profiles?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{doc.document_type}</span>
                        {doc.document_type?.toLowerCase().includes('aadhar') && (
                          <Badge variant="secondary" className="text-xs">Aadhar</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          doc.profiles?.kyc_status === 'verified' 
                            ? 'text-green-700 bg-green-100' 
                            : doc.profiles?.kyc_status === 'rejected'
                            ? 'text-red-700 bg-red-100'
                            : 'text-yellow-700 bg-yellow-100'
                        }
                      >
                        {doc.profiles?.kyc_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Document Details</DialogTitle>
                              <DialogDescription>
                                {selectedDocument?.document_type} - {selectedDocument?.profiles?.full_name}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedDocument && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">User Name</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedDocument.profiles?.full_name || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedDocument.profiles?.email || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Document Type</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedDocument.document_type}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Upload Date</label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(selectedDocument.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="border rounded-lg p-4">
                                  <h4 className="font-medium mb-2">Document Preview</h4>
                                  <div className="flex justify-center">
                                    <img 
                                      src={selectedDocument.document_url} 
                                      alt="Document"
                                      className="max-w-full max-h-96 object-contain rounded border"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                      }}
                                    />
                                    <div className="hidden text-center text-muted-foreground">
                                      <FileText className="h-16 w-16 mx-auto mb-2" />
                                      <p>Document preview not available</p>
                                      <Button
                                        variant="outline"
                                        className="mt-2"
                                        onClick={() => window.open(selectedDocument.document_url, '_blank')}
                                      >
                                        Open in new tab
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(
                            doc.document_url, 
                            `${doc.document_type}_${doc.profiles?.full_name || 'unknown'}.jpg`
                          )}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocuments.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? 'No documents found matching your search.' : 'No documents uploaded yet.'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};