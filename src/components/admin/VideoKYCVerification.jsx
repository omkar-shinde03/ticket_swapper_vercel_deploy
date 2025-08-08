import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Video, VideoIcon, Mic, MicOff, VideoOff, Phone, CheckCircle, X, User, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const VideoKYCVerification = ({ users, onUpdate }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [pendingUsers, setPendingUsers] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    // Filter users with pending KYC
    const pending = users.filter(user => 
      user.kyc_status === 'pending' || user.kyc_status === 'not_verified'
    );
    setPendingUsers(pending);
  }, [users]);

  const startVideoCall = async (user) => {
    setActiveCall(user);
    setShowVideoDialog(true);
    
    try {
      // Get admin media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Update video call status to indicate admin joined
      await supabase
        .from('video_calls')
        .update({ 
          status: 'admin_connected',
          admin_id: (await supabase.auth.getUser()).data.user.id
        })
        .eq('user_id', user.id)
        .eq('status', 'waiting_admin');
        
      toast({
        title: "Video Call Started",
        description: `Connected with ${user.full_name || user.email} for KYC verification.`,
      });
      
    } catch (error) {
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access.",
        variant: "destructive",
      });
      setShowVideoDialog(false);
      setActiveCall(null);
    }
  };

  const endVideoCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setShowVideoDialog(false);
    setActiveCall(null);
    setVerificationNotes("");
  };

  const approveKYC = async () => {
    if (!activeCall) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'verified',
          kyc_verified_at: new Date().toISOString(),
          kyc_notes: verificationNotes
        })
        .eq('id', activeCall.id);

      if (error) throw error;

      // Update video call record
      await supabase
        .from('video_calls')
        .update({ 
          status: 'completed',
          verification_result: 'approved',
          admin_notes: verificationNotes
        })
        .eq('user_id', activeCall.id);

      toast({
        title: "KYC Approved",
        description: `${activeCall.full_name || activeCall.email} has been verified successfully.`,
      });
      
      endVideoCall();
      onUpdate();
    } catch (error) {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectKYC = async () => {
    if (!activeCall) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'rejected',
          kyc_notes: verificationNotes
        })
        .eq('id', activeCall.id);

      if (error) throw error;

      // Update video call record
      await supabase
        .from('video_calls')
        .update({ 
          status: 'completed',
          verification_result: 'rejected',
          admin_notes: verificationNotes
        })
        .eq('user_id', activeCall.id);

      toast({
        title: "KYC Rejected",
        description: `${activeCall.full_name || activeCall.email} verification has been rejected.`,
        variant: "destructive",
      });
      
      endVideoCall();
      onUpdate();
    } catch (error) {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const viewDocument = async (user) => {
    if (user.kyc_document_url) {
      const { data } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(user.kyc_document_url, 60);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video KYC Verification</CardTitle>
          <CardDescription>
            Conduct video verification for pending KYC applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No pending KYC verifications</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{user.full_name || user.email}</h4>
                        <p className="text-sm text-gray-500">{user.phone || 'No phone'}</p>
                        <Badge 
                          variant="outline" 
                          className={
                            user.kyc_status === 'pending' 
                              ? 'text-orange-700 bg-orange-100' 
                              : 'text-gray-700 bg-gray-100'
                          }
                        >
                          {user.kyc_status === 'pending' ? 'Pending Review' : 'Not Started'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.kyc_document_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDocument(user)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Document
                        </Button>
                      )}
                      <Button
                        onClick={() => startVideoCall(user)}
                        disabled={!user.kyc_document_url}
                        size="sm"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Start Video Call
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Call Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>KYC Video Verification - {activeCall?.full_name || activeCall?.email}</DialogTitle>
            <DialogDescription>
              Verify the user's identity by examining their Aadhaar card
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-3 gap-4 h-full">
            {/* User Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                User: {activeCall?.full_name || activeCall?.email}
              </div>
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <VideoIcon className="h-12 w-12 text-gray-400 mb-2 mx-auto" />
                  <span className="text-gray-400 text-sm">User Camera</span>
                </div>
              </div>
            </div>

            {/* Admin Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                You (Admin)
              </div>
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Verification Panel */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Verification Checklist</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Verify face matches Aadhaar photo</li>
                  <li>• Check Aadhaar card authenticity</li>
                  <li>• Confirm personal details</li>
                  <li>• Ensure clear document visibility</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Verification Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add verification notes here..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={approveKYC}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={rejectKYC}
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              onClick={toggleMute}
              className="rounded-full h-12 w-12"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full h-12 w-12"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="destructive"
              size="icon"
              onClick={endVideoCall}
              className="rounded-full h-12 w-12"
            >
              <Phone className="h-5 w-5 rotate-45" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};