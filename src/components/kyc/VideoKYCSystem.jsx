import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Video, VideoOff, Mic, MicOff, Phone, CheckCircle, XCircle, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VideoKYCSystem = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const fetchPendingKYC = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('kyc_status', 'pending')
        .not('kyc_documents', 'is', null);

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending KYC:', error);
    }
  };

  const startVideoCall = async (user) => {
    try {
      setCallStatus('calling');
      setActiveCall(user);

      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create video call record
      const { error } = await supabase
        .from('video_calls')
        .insert({
          user_id: user.id,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'active',
          call_type: 'kyc_verification'
        });

      if (error) throw error;

      setCallStatus('connected');
      toast({
        title: "Video Call Started",
        description: `Connected with ${user.full_name}`,
      });
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive"
      });
      setCallStatus('idle');
      setActiveCall(null);
    }
  };

  const endVideoCall = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (activeCall) {
        await supabase
          .from('video_calls')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            notes: verificationNotes
          })
          .eq('user_id', activeCall.id)
          .eq('status', 'active');
      }

      setActiveCall(null);
      setCallStatus('idle');
      setVerificationNotes('');
      toast({
        title: "Call Ended",
        description: "Video call has been terminated",
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const approveKYC = async () => {
    if (!activeCall) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'approved',
          kyc_verified_at: new Date().toISOString(),
          kyc_notes: verificationNotes
        })
        .eq('id', activeCall.id);

      if (error) throw error;

      // Send approval email
      await supabase.functions.invoke('send-email', {
        body: {
          to: activeCall.email,
          template: 'kyc_approved',
          templateData: {
            name: activeCall.full_name,
            dashboardUrl: `${window.location.origin}/dashboard`
          }
        }
      });

      toast({
        title: "KYC Approved",
        description: `${activeCall.full_name}'s KYC has been approved`,
      });

      endVideoCall();
      fetchPendingKYC();
    } catch (error) {
      console.error('Error approving KYC:', error);
      toast({
        title: "Error",
        description: "Failed to approve KYC",
        variant: "destructive"
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

      // Send rejection email
      await supabase.functions.invoke('send-email', {
        body: {
          to: activeCall.email,
          template: 'kyc_rejected',
          templateData: {
            name: activeCall.full_name,
            reason: verificationNotes,
            dashboardUrl: `${window.location.origin}/dashboard`
          }
        }
      });

      toast({
        title: "KYC Rejected",
        description: `${activeCall.full_name}'s KYC has been rejected`,
        variant: "destructive"
      });

      endVideoCall();
      fetchPendingKYC();
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      toast({
        title: "Error",
        description: "Failed to reject KYC",
        variant: "destructive"
      });
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const viewDocument = (user) => {
    if (user.kyc_documents) {
      window.open(user.kyc_documents, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video KYC Verification System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending KYC verifications
              </div>
            ) : (
              pendingUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">Pending Verification</Badge>
                      <span className="text-sm text-muted-foreground">
                        Submitted: {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDocument(user)}
                      disabled={!user.kyc_documents}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Docs
                    </Button>
                    <Button
                      onClick={() => startVideoCall(user)}
                      disabled={callStatus !== 'idle'}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Start Call
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Call Dialog */}
      <Dialog open={activeCall !== null} onOpenChange={() => endVideoCall()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video KYC Verification - {activeCall?.full_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Video Streams */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-64 bg-gray-900 rounded-lg"
                />
                <Badge className="absolute top-2 left-2">Admin (You)</Badge>
              </div>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  className="w-full h-64 bg-gray-900 rounded-lg"
                />
                <Badge className="absolute top-2 left-2">{activeCall?.full_name}</Badge>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex justify-center gap-4">
              <Button
                variant={audioEnabled ? "default" : "destructive"}
                size="sm"
                onClick={toggleAudio}
              >
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={videoEnabled ? "default" : "destructive"}
                size="sm"
                onClick={toggleVideo}
              >
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={endVideoCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            {/* Verification Notes */}
            <div>
              <label className="text-sm font-medium">Verification Notes</label>
              <Textarea
                placeholder="Add notes about the verification process..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Verification Actions */}
            <div className="flex gap-4">
              <Button
                onClick={approveKYC}
                className="flex-1"
                disabled={!verificationNotes.trim()}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve KYC
              </Button>
              <Button
                onClick={rejectKYC}
                variant="destructive"
                className="flex-1"
                disabled={!verificationNotes.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject KYC
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoKYCSystem;