import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Toaster } from './ui/sonner';
import { 
  Bot, Home, ShoppingBag, GraduationCap, MessageSquare, Users,
  LogOut, Menu, X, Settings
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { userName, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    switch (userRole) {
      case 'farmer': return '/dashboard/farmer';
      case 'compost_processor': return '/dashboard/compost-processor';
      case 'seller': return '/dashboard/seller';
      case 'buyer': return '/dashboard/buyer';
      case 'admin': return '/dashboard/admin';
      default: return '/';
    }
  };

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: getDashboardPath() },
    { icon: ShoppingBag, label: userRole === 'seller' ? 'My Catalog' : 'Marketplace', path: '/marketplace' },
    { icon: GraduationCap, label: 'Education', path: '/education' },
    { icon: Users, label: 'Forum', path: '/forum' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-purple-100 sticky top-0 z-40 backdrop-blur-sm bg-white/80">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-gray-900">{title}</div>
                  <div className="text-xs text-gray-500 capitalize">{userRole?.replace('_', ' ')}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm text-gray-900">{userName}</div>
                  <div className="text-xs text-gray-500 capitalize">{userRole?.replace('_', ' ')}</div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          fixed lg:sticky top-16 left-0 z-30 w-64 h-[calc(100vh-4rem)] 
          bg-white border-r border-purple-100 transition-transform duration-300 lg:translate-x-0
          overflow-y-auto`}>
          
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-purple-700"
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-100 bg-white">
            <Link to="/settings">
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-gray-600 hover:bg-gray-100 mb-2"
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start rounded-xl text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Toaster />
    </div>
  );
}
