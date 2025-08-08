
import { Button } from "@/components/ui/button";
import { Bus, Menu, X, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Simplified auth check to prevent crashes
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Auth error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Simplified auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        setUser(session?.user || null);
        setIsLoading(false);
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <header className="glass-effect shadow-lg border-b border-border sticky top-0 z-50 animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary rounded-lg shadow-sm">
              <Bus className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              TicketSwapper
            </span>
          </div>
          
          {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-foreground hover:text-primary transition-all duration-200 font-medium hover:scale-105">
                Features
              </a>
              <a href="#contact" className="text-foreground hover:text-primary transition-all duration-200 font-medium hover:scale-105">
                Contact
              </a>
            </nav>
          
          {/* Desktop Auth Buttons */}
          {isLoading ? (
            <div className="hidden md:flex space-x-3">
              <div className="h-10 w-20 bg-muted animate-pulse rounded"></div>
              <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          ) : user ? (
            <div className="hidden md:flex space-x-3 items-center">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleDashboard}>
                <User className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex space-x-3">
              <Link to="/auth">
                <Button variant="outline" size="lg">
                  Login
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="default" size="lg">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in-up">
            <nav className="flex flex-col space-y-4">
              <a href="#features" className="text-foreground hover:text-primary transition-all duration-200 font-medium">
                Features
              </a>
              <a href="#contact" className="text-foreground hover:text-primary transition-all duration-200 font-medium">
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <>
                    <span className="text-sm text-muted-foreground px-2">
                      Welcome, {user.email}
                    </span>
                    <Button variant="outline" size="lg" className="w-full" onClick={handleDashboard}>
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                    <Button variant="ghost" size="lg" className="w-full" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="outline" size="lg" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button variant="default" size="lg" className="w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
