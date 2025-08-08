
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock } from "lucide-react";
import { handleUserLogin } from "@/utils/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    emailOrPhone: "",
    password: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await handleUserLogin(loginData.emailOrPhone, loginData.password);

      if (result.isAdmin) {
        navigate("/admin");
        toast({
          title: "Admin login successful!",
          description: "Welcome to the admin dashboard.",
        });
      } else {
        // Check user type for regular users
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

          if (profileData?.user_type === 'admin') {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }

        toast({
          title: "Login successful!",
          description: "Welcome to TicketSwapper.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email-phone">Email or Phone Number</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="login-email-phone"
            type="text"
            placeholder="Enter your email or phone number"
            className="pl-10"
            value={loginData.emailOrPhone}
            onChange={(e) => setLoginData({...loginData, emailOrPhone: e.target.value})}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            className="pl-10"
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            required
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
};

export default LoginForm;
