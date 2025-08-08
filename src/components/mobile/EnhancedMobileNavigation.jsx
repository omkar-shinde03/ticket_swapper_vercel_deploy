
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Home, 
  Search, 
  Plus, 
  MessageSquare, 
  User,
  Bell,
  Menu,
  X,
  Settings,
  HelpCircle,
  LogOut,
  History,
  Shield,
  Star,
  CreditCard
} from 'lucide-react';

export const EnhancedMobileNavigation = ({ 
  user, 
  notifications = 0, 
  unreadMessages = 0,
  onLogout 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const isActive = (path) => location.pathname === path;

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const mainNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/dashboard', icon: Search, label: 'Browse' },
    { path: '/sell', icon: Plus, label: 'Sell' },
    { 
      path: '/messages', 
      icon: MessageSquare, 
      label: 'Messages',
      badge: unreadMessages > 0 ? unreadMessages : null
    },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const menuItems = [
    { path: '/dashboard', icon: Search, label: 'Dashboard' },
    { path: '/transactions', icon: History, label: 'Transaction History' },
    { path: '/verification', icon: Shield, label: 'Verification' },
    { path: '/reviews', icon: Star, label: 'Reviews & Ratings' },
    { path: '/payments', icon: CreditCard, label: 'Payment Methods' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/support', icon: HelpCircle, label: 'Help & Support' },
  ];

  if (!isMobile) return null;

  return (
    <>
      {/* Mobile Top Header */}
      <div className={`sticky top-0 bg-white/95 backdrop-blur-sm border-b z-40 transition-all duration-200 ${
        isScrolled ? 'shadow-sm' : ''
      }`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="p-0 h-auto font-bold text-xl text-blue-600"
            >
              TicketRescue
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0"
                >
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </Button>

            {/* Menu Toggle */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  {/* User Profile Section */}
                  {user ? (
                    <div className="pb-6 border-b">
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-blue-600">0</p>
                          <p className="text-xs text-blue-600">Sold</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-green-600">0</p>
                          <p className="text-xs text-green-600">Bought</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-yellow-600">5.0</p>
                          <p className="text-xs text-yellow-600">Rating</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pb-6 border-b">
                      <h3 className="font-semibold text-gray-900 mb-2">Welcome!</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Sign in to access all features
                      </p>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/auth');
                        }}
                      >
                        Sign In / Sign Up
                      </Button>
                    </div>
                  )}
                  
                  {/* Menu Items */}
                  <div className="flex-1 py-4 space-y-1">
                    {user ? (
                      menuItems.map((item) => {
                        const IconComponent = item.icon;
                        const active = isActive(item.path);
                        
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                              active 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <IconComponent className="h-5 w-5" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="space-y-1">
                        <Link
                          to="/browse"
                          className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                        >
                          <Search className="h-5 w-5" />
                          <span className="font-medium">Browse Tickets</span>
                        </Link>
                        <Link
                          to="/help"
                          className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                        >
                          <HelpCircle className="h-5 w-5" />
                          <span className="font-medium">Help</span>
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {/* Logout Button */}
                  {user && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLogout?.();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t z-40 safe-area-pb">
        <div className="grid grid-cols-5 py-2">
          {mainNavItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 relative transition-colors ${
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <div className="relative">
                  <IconComponent className="h-5 w-5" />
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-xs p-0"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium mt-1 leading-none">
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20" />
    </>
  );
};
