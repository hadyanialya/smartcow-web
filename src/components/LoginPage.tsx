import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRole } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Bot, User, Mail, Lock, Loader2, ArrowLeft, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { registerUser, loginUser } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '', role: '' as UserRole });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    role: '' as UserRole 
  });
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!loginForm.email || !loginForm.password || !loginForm.role) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await loginUser(loginForm.email, loginForm.password);
    
    if (result.success && result.user) {
      // Check if role matches
      if (result.user.role !== loginForm.role) {
        setError(`This account is registered as ${getRoleLabel(result.user.role)}. Please select the appropriate role.`);
        setIsLoading(false);
        return;
      }
      
      setSuccess('Login successful! Redirecting to dashboard...');
      login(result.user.role, result.user.name, result.user.id);
      
      setTimeout(() => {
        navigateToDashboard(result.user!.role);
      }, 1000);
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate all fields
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword || !registerForm.role) {
      setError('Please fill in all fields');
      return;
    }

    // Check password match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await registerUser(
      registerForm.name,
      registerForm.email,
      registerForm.password,
      registerForm.role
    );
    
    if (result.success && result.user) {
      setSuccess('Registration successful! Redirecting to dashboard...');
      login(result.user.role, result.user.name);
      setTimeout(() => {
        navigateToDashboard(result.user!.role);
      }, 800);
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      farmer: 'Farmer',
      compost_processor: 'Compost Processor',
      seller: 'Seller',
      buyer: 'Buyer',
      admin: 'Administrator',
    };
    return labels[role] || role;
  };

  const navigateToDashboard = (role: UserRole) => {
    switch (role) {
      case 'farmer':
        navigate('/dashboard/farmer');
        break;
      case 'compost_processor':
        navigate('/dashboard/compost-processor');
        break;
      case 'seller':
        navigate('/dashboard/seller');
        break;
      case 'buyer':
        navigate('/dashboard/buyer');
        break;
      case 'admin':
        navigate('/dashboard/admin');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4 relative">
      {/* Back to Home fixed top-left */}
      <Link to="/" className="absolute top-4 left-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Homepage
      </Link>
      <div className="w-full max-w-md mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-600">Access the Smart Cow Waste Cleaning platform</p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => {
              setActiveTab(value as 'login' | 'register');
              setError('');
              setSuccess('');
              setShowForgotInfo(false);
            }} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-2 rounded-none">
              <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@email.com"
                      className="pl-10 rounded-xl border-purple-200 focus:border-purple-400"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-12 rounded-xl border-purple-200 focus:border-purple-400"
                      style={{ paddingRight: '3rem' }}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none z-20"
                      style={{ right: '0.75rem' }}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-role">Select Your Role</Label>
                  <Select 
                    value={loginForm.role || ''} 
                    onValueChange={(value) => setLoginForm({ ...loginForm, role: value as UserRole })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="rounded-xl border-purple-200">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="compost_processor">Compost Processor</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    className="text-sm text-purple-600 hover:text-purple-700 mx-auto block"
                    onClick={() => setShowForgotInfo(!showForgotInfo)}
                  >
                    Forgot password?
                  </button>
                  {showForgotInfo && (
                    <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mx-auto max-w-xs">
                      Contact admin via email <span className="font-medium">support@smartcow.com</span> for password reset assistance.
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-purple-600"
                    onClick={() => {
                      setActiveTab('register');
                      setError('');
                      setSuccess('');
                      setShowForgotInfo(false);
                    }}
                  >
                    Don't have an account? <span className="text-purple-600 font-medium">Register first</span>
                  </button>
                </div>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="p-8">
              <form onSubmit={handleRegister} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Your name"
                      className="pl-10 rounded-xl border-purple-200 focus:border-purple-400"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@email.com"
                      className="pl-10 rounded-xl border-purple-200 focus:border-purple-400"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      className="pl-10 pr-12 rounded-xl border-purple-200 focus:border-purple-400"
                      style={{ paddingRight: '3rem' }}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none z-20"
                      style={{ right: '0.75rem' }}
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Minimum 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      className="pl-10 pr-12 rounded-xl border-purple-200 focus:border-purple-400"
                      style={{ paddingRight: '3rem' }}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none z-20"
                      style={{ right: '0.75rem' }}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-role">Register As</Label>
                  <Select 
                    value={registerForm.role || ''} 
                    onValueChange={(value) => setRegisterForm({ ...registerForm, role: value as UserRole })}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="rounded-xl border-purple-200">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="compost_processor">Compost Processor</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      {/* Admin cannot be registered */}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
