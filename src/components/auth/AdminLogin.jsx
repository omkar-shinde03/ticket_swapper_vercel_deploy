import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff } from "lucide-react";

export const AdminLogin = () => {
  const [email, setEmail] = useState("omstemper1@gmail.com");
  const [password, setPassword] = useState("redlily@3B");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Attempting admin login with email:", email);
      
      // First try to sign in
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError && loginError.message === "Invalid login credentials") {
        console.log("User doesn't exist, creating admin account...");
        
        // If login fails, try to create the admin account
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: "Admin",
              user_type: 'admin'
            }
          }
        });

        if (signupError) {
          console.error("Signup error:", signupError);
          throw signupError;
        }

        console.log("Admin account created:", signupData);
        
        // Create admin profile - Admin doesn't need KYC
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: signupData.user.id,
            email: signupData.user.email,
            full_name: "Admin",
            user_type: 'admin',
            kyc_status: 'verified' // Admin automatically verified
          });

        if (profileError) {
          console.error("Error creating admin profile:", profileError);
          // Continue anyway as profile might already exist
        }

        toast({
          title: "Admin account created",
          description: "Please check your email to verify your account, then try logging in again.",
        });
        
        return;
      } else if (loginError) {
        console.error("Login error:", loginError);
        throw loginError;
      }

      console.log("Login successful, user:", loginData.user);

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', loginData.user.id)
        .single();

      console.log("Profile query result:", { profile, profileError });

      if (profileError) {
        console.error("Profile error:", profileError);
        // If profile doesn't exist, create admin profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: loginData.user.id,
            email: loginData.user.email,
            full_name: loginData.user.user_metadata?.full_name || "Admin",
            user_type: 'admin',
            kyc_status: 'verified'
          });

        if (insertError) {
          console.error("Error creating admin profile:", insertError);
          await supabase.auth.signOut();
          throw new Error('Failed to create admin profile');
        }

        console.log("Admin profile created successfully");
      } else if (profile?.user_type !== 'admin') {
        console.log("User is not admin, user_type:", profile?.user_type);
        await supabase.auth.signOut();
        throw new Error('Admin access required');
      }

      toast({
        title: "Admin login successful",
        description: "Welcome to the admin dashboard.",
      });
      
      navigate("/admin");
    } catch (error) {
      console.error("Admin login failed:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Access the admin dashboard for KYC verification and user management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Create Admin Account / Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Admin Setup</h4>
            <p className="text-sm text-blue-700">
              <strong>Email:</strong> omstemper1@gmail.com<br/>
              <strong>Password:</strong> redlily@3B<br/>
              <strong>Note:</strong> First time? Click button to create admin account.
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => navigate("/auth")}
              className="text-sm"
            >
              Back to regular login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};