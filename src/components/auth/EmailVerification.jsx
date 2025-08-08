import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EmailVerification = ({ email, onVerified, onBack }) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsExpired(true);
    }
  }, [countdown]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (isExpired) {
      toast({
        title: "Code expired",
        description: "The verification code has expired. Please request a new one.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: verificationCode,
        type: 'signup'
      });

      if (error) throw error;

      // Ensure profile is created after verification
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || null,
              phone: data.user.user_metadata?.phone || null,
              user_type: data.user.user_metadata?.user_type || 'user',
              kyc_status: 'pending'
            });

          if (insertError) {
            console.error("Error creating profile:", insertError);
          }
        }
      }

      toast({
        title: "Email verified successfully!",
        description: "Your account has been activated. Redirecting to dashboard...",
      });

      // Small delay to show the success message before redirecting
      setTimeout(() => {
        onVerified();
      }, 1000);
    } catch (error) {
      console.error("Verification error:", error);
      
      let errorMessage = "Invalid verification code. Please try again.";
      
      if (error.message) {
        if (error.message.includes("expired") || error.message.includes("Token has expired")) {
          errorMessage = "Verification code has expired. Please request a new one.";
          setIsExpired(true);
        } else if (error.message.includes("invalid") || error.message.includes("Token is invalid")) {
          errorMessage = "Invalid verification code. Please check and try again.";
        } else if (error.message.includes("already been verified")) {
          errorMessage = "This email has already been verified. Please try logging in.";
        }
      }
      
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast({
        title: "Verification code sent",
        description: "A new verification code has been sent to your email.",
      });

      setCountdown(60);
      setIsExpired(false);
      setVerificationCode("");
    } catch (error) {
      console.error("Resend error:", error);
      toast({
        title: "Failed to resend code",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="text-gray-600">
          We've sent a verification code to <br />
          <span className="font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="Enter 6-digit code"
            className="text-center text-lg tracking-widest"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Only allow digits
              if (value.length <= 6) {
                setVerificationCode(value);
              }
            }}
            maxLength="6"
            required
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || verificationCode.length !== 6 || isExpired}
          size="lg"
        >
          {isLoading ? "Verifying..." : isExpired ? "Code Expired" : "Verify Email"}
        </Button>
      </form>

      <div className="text-center space-y-4">
        <div className="text-sm text-gray-600">
          {isExpired ? (
            <span className="text-red-600 font-medium">Code expired! Please resend.</span>
          ) : (
            <>Didn't receive the code?{" "}</>
          )}
          {countdown > 0 ? (
            <span>Resend in {countdown}s</span>
          ) : (
            <button
              onClick={handleResendCode}
              disabled={isResending}
              className="text-blue-600 hover:underline font-medium"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to signup
        </Button>
      </div>
    </div>
  );
};

export default EmailVerification;