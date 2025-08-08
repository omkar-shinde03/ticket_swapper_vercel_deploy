import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Video, CheckCircle, AlertCircle, VideoIcon, Mic, MicOff, VideoOff, Phone, Clock } from "lucide-react";

export const KYCCompletion = ({ profile, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStep, setUploadStep] = useState('upload'); // upload, verify, complete, video-call, waiting-admin
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('waiting'); // waiting, connected, ended
  const [adminConnected, setAdminConnected] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const { toast } = useToast();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG image or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-aadhaar-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      setUploadedFile(fileName);
      setUploadStep('verify');
      
      toast({
        title: "Document uploaded",
        description: "Please proceed to video verification.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startVideoCall = async () => {
    setShowVideoDialog(true);
    setUploadStep('video-call');
    
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsInCall(true);
      setCallStatus('waiting');
      
      // Create a video call record in the database
      const { error } = await supabase
        .from('video_calls')
        .insert({
          user_id: profile.id,
          status: 'waiting_admin',
          call_type: 'kyc_verification'
        });
        
      if (error) {
        console.error('Error creating video call record:', error);
      }
      
      // Simulate admin connection after 3 seconds
      setTimeout(() => {
        setAdminConnected(true);
        setCallStatus('connected');
        toast({
          title: "Admin Connected",
          description: "Please show your Aadhaar card to the camera for verification.",
        });
      }, 3000);
      
    } catch (error) {
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access for video verification.",
        variant: "destructive",
      });
      setShowVideoDialog(false);
      setUploadStep('verify');
    }
  };

  const endVideoCall = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsInCall(false);
    setShowVideoDialog(false);
    setCallStatus('ended');
    setUploadStep('waiting-admin');
    
    // Update video call status
    await supabase
      .from('video_calls')
      .update({ status: 'completed' })
      .eq('user_id', profile.id)
      .eq('status', 'waiting_admin');
      
    toast({
      title: "Video Call Ended",
      description: "Your verification is being reviewed by our admin team.",
    });
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

  // Listen for admin verification updates
  useEffect(() => {
    if (profile?.id) {
      const channel = supabase
        .channel(`kyc_updates_${profile.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        }, (payload) => {
          if (payload.new.kyc_status === 'verified') {
            toast({
              title: "KYC Verified!",
              description: "Your KYC has been verified by admin. You can now start selling tickets.",
            });
            onUpdate();
          } else if (payload.new.kyc_status === 'rejected') {
            toast({
              title: "KYC Rejected",
              description: "Your KYC was rejected. Please try again with correct documents.",
              variant: "destructive",
            });
            setUploadStep('upload');
            setUploadedFile(null);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id, onUpdate]);

  const handleKYCSubmission = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'pending',
          kyc_document_url: uploadedFile 
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "KYC Submitted",
        description: "Your KYC verification has been submitted for admin review.",
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (profile?.kyc_status === 'verified') {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Complete KYC Verification
        </CardTitle>
        <CardDescription>
          Complete your KYC verification to start selling tickets safely
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {uploadStep === 'upload' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="aadhaar-upload" className="text-base font-medium">
                Upload Aadhaar Card
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Upload a clear photo or PDF of your Aadhaar card for verification
              </p>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <Input
                  id="aadhaar-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                />
                <Label
                  htmlFor="aadhaar-upload"
                  className="cursor-pointer inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                >
                  <FileText className="h-4 w-4" />
                  Choose File
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: JPEG, PNG, PDF (Max 5MB)
                </p>
              </div>
            </div>
          </div>
        )}

        {uploadStep === 'verify' && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">Document Uploaded Successfully</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Video className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-medium text-blue-900 mb-2">Video Verification Required</h3>
              <p className="text-sm text-blue-700 mb-4">
                To complete your KYC, we need to verify your identity through a quick video call
              </p>
              <Button 
                onClick={startVideoCall}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Video className="h-4 w-4 mr-2" />
                Start Video Verification
              </Button>
            </div>
          </div>
        )}

        {uploadStep === 'waiting-admin' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <CheckCircle className="h-8 w-8" />
              <span className="text-lg font-medium">Video Verification Complete!</span>
            </div>
            <p className="text-muted-foreground">
              Your video verification has been completed. Admin is reviewing your KYC submission.
            </p>
            <Badge variant="outline" className="text-orange-700 bg-orange-100">
              Under Admin Review
            </Badge>
          </div>
        )}

        {uploadStep === 'complete' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <span className="text-lg font-medium">KYC Verification Complete!</span>
            </div>
            <p className="text-muted-foreground">
              Your KYC has been submitted for admin review. You'll be notified once approved.
            </p>
            <Badge variant="outline" className="text-orange-700 bg-orange-100">
              Under Review
            </Badge>
          </div>
        )}
      </CardContent>

      {/* Video Call Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>KYC Video Verification</DialogTitle>
            <DialogDescription>
              {callStatus === 'waiting' ? 'Waiting for admin to join...' : 
               callStatus === 'connected' ? 'Admin is connected. Please show your Aadhaar card.' :
               'Video call ended'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-2 gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                You
              </div>
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Remote Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                {adminConnected ? 'Admin' : 'Waiting...'}
              </div>
              {!adminConnected && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center flex-col">
                  <div className="animate-pulse">
                    <VideoIcon className="h-12 w-12 text-gray-400 mb-2" />
                  </div>
                  <span className="text-gray-400">Waiting for admin...</span>
                </div>
              )}
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

          {callStatus === 'connected' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700">
                Please hold your Aadhaar card clearly in front of the camera for verification
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};