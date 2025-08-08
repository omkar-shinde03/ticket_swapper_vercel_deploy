
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check user type and redirect accordingly
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', session.user.id)
          .single();

        if (profileData?.user_type === 'admin') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if email is verified before proceeding
        if (!session.user.email_confirmed_at) {
          console.log("Email not verified yet");
          return;
        }

        // Check user type and redirect accordingly
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', session.user.id)
          .single();

        if (profileData?.user_type === 'admin') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AuthLayout />;
};

export default Auth;
