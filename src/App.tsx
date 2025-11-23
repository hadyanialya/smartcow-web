import { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import FarmerDashboard from './components/dashboards/FarmerDashboard';
import CompostProcessorDashboard from './components/dashboards/CompostProcessorDashboard';
import SellerDashboard from './components/dashboards/SellerDashboard';
import BuyerDashboard from './components/dashboards/BuyerDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import EducationalContent from './components/EducationalContent';
import Forum from './components/Forum';
import Marketplace from './components/Marketplace';
  import Chat from './components/Chat';
  import Settings from './components/Settings';

export type UserRole = 'farmer' | 'compost_processor' | 'seller' | 'buyer' | 'admin' | null;

interface AuthContextType {
  userRole: UserRole;
  userName: string;
  isAuthenticated: boolean;
  login: (role: UserRole, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AUTH_STORAGE_KEY = 'smartcow_auth';
const CART_STORAGE_PREFIX = 'smartcow_cart:';

function App() {
  // Load session from localStorage on mount
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const auth = JSON.parse(saved);
        return auth.role || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const auth = JSON.parse(saved);
        return auth.name || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved !== null;
  });

  const login = (role: UserRole, name: string) => {
    setUserRole(role);
    setUserName(name);
    setIsAuthenticated(true);
    // Save to localStorage
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role, name }));
  };

  const logout = () => {
    setUserRole(null);
    setUserName('');
    setIsAuthenticated(false);
    // Clear from localStorage
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Reset cart data when logging out
    setCart([]);
  };

  const authValue: AuthContextType = {
    userRole,
    userName,
    isAuthenticated,
    login,
    logout,
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  // Load cart when auth changes (per user/role)
  useEffect(() => {
    if (!isAuthenticated || !userRole) {
      setCart([]);
      return;
    }
    const key = `${CART_STORAGE_PREFIX}${userRole}:${userName || 'anonymous'}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
        else setCart([]);
      } else {
        setCart([]);
      }
    } catch {
      setCart([]);
    }
  }, [isAuthenticated, userRole, userName]);

  // Persist cart changes per user/role
  useEffect(() => {
    if (!isAuthenticated || !userRole) return;
    const key = `${CART_STORAGE_PREFIX}${userRole}:${userName || 'anonymous'}`;
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {
      // ignore storage write errors
    }
  }, [cart, isAuthenticated, userRole, userName]);
  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.min(quantity, i.stock) } : i));
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  const getTotal = () => cart.reduce((t, i) => t + i.price * i.quantity, 0);

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, getTotal }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard/farmer"
            element={isAuthenticated && userRole === 'farmer' ? <FarmerDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/compost-processor"
            element={isAuthenticated && userRole === 'compost_processor' ? <CompostProcessorDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/seller"
            element={isAuthenticated && userRole === 'seller' ? <SellerDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/buyer"
            element={isAuthenticated && userRole === 'buyer' ? <BuyerDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/admin"
            element={isAuthenticated && userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />}
          />
          
          {/* Public Pages */}
          <Route path="/marketplace" element={<Marketplace />} />
          
          {/* Shared Pages - Require Authentication */}
          <Route
            path="/education"
            element={isAuthenticated ? <EducationalContent /> : <Navigate to="/login" />}
          />
          <Route
            path="/forum"
            element={isAuthenticated ? <Forum /> : <Navigate to="/login" />}
          />
          <Route
            path="/chat"
            element={isAuthenticated ? <Chat /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
          />
          
          {/* Catch-all route - redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
type CartItem = {
  id: string;
  name: string;
  seller: string;
  price: number;
  unit: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  description: string;
  image: null | string;
  stock: number;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
};

const CartContext = createContext<CartContextType | null>(null);
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('CartContext not available');
  return ctx;
};
