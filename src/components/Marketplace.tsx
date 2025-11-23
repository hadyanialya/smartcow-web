import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent } from './ui/dialog';
import { Progress } from './ui/progress';
import {
  ShoppingBag, Search, Filter, Star,
  MessageSquare, Package, Leaf, DollarSign,
  ShoppingCart, Heart, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, Truck, Bot, Shield, BarChart3, TrendingUp
} from 'lucide-react';
import { formatCustomIdr, formatPriceWithSeparator } from '../utils/currency';
import { useCart, useAuth } from '../App';
import { getMarketplaceProducts, createOrderForSeller, addLikedProduct, removeLikedProduct, isProductLiked, getLikedProducts } from '../services/backend';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Product {
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
  image: string | null;
  stock: number;
  createdAt?: number;
  sellerId?: string;
}

// Marketplace should start empty; products are loaded from the backend/localStorage only

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  // Price range: Default to very wide range to show all products
  // Note: Prices are in IDR, so range should accommodate large values
  const [priceRange, setPriceRange] = useState([0, 100000000]); // 100 million IDR max
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getTotal } = useCart();
  const { userRole, userName } = useAuth();
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [orderSummary, setOrderSummary] = useState<{
    orderId: string;
    items: (Product & { quantity: number })[];
    total: number;
    method: string;
  } | null>(null);
  const userId = `${userRole}:${userName || 'anonymous'}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (!userName || !userRole) return new Set();
    const liked = getLikedProducts(userId);
    return new Set(liked);
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [balance, setBalance] = useState(10000000);
  const [orders, setOrders] = useState<{
    id: string;
    items: (Product & { quantity: number })[];
    totalIdr: number;
    status: 'Being Packed' | 'In Delivery' | 'Completed';
    createdAt: number;
    trackingNo: string;
  }[]>([]);
  const [view, setView] = useState<'browse' | 'cart' | 'payment' | 'processing' | 'payment-success' | 'orders' | 'saved'>('browse');
  const [paymentCheckoutItems, setPaymentCheckoutItems] = useState<(Product & { quantity: number })[]>([]);
  const [paymentError, setPaymentError] = useState('');
  const [currentRatingProduct, setCurrentRatingProduct] = useState<Product | null>(null);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [productRatings, setProductRatings] = useState<{ [productId: string]: { ratings: number[]; count: number; average: number } }>({});

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);
  
  useEffect(() => {
    // Load ratings from localStorage
    const loadRatings = () => {
      try {
        const saved = localStorage.getItem('smartcow_product_ratings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setProductRatings(parsed);
        }
      } catch {}
    };
    loadRatings();

    const readReviewCount = (id: string) => {
      try {
        const ratings = JSON.parse(localStorage.getItem('smartcow_product_ratings') || '{}');
        return ratings[id]?.count || 0;
      } catch { return 0; }
    };

    const readRating = (id: string) => {
      try {
        const ratings = JSON.parse(localStorage.getItem('smartcow_product_ratings') || '{}');
        return ratings[id]?.average || 4.6;
      } catch { return 4.6; }
    };
    const enrich = (p: any): Product => {
      try {
        const cat = (p.category || '').toString();
        const priceRaw = typeof p.price === 'number' ? p.price : Number(p.price || 0);
        const price = priceRaw;
        
        // CRITICAL: Check status correctly - must be exactly 'active' (case-sensitive)
        const status = String(p.status || '').trim();
        const isActive = status === 'active';
        const stock = Number(p.stock || 0);
        
        // inStock = product is active AND has stock > 0
        // This determines if product can be purchased
        const inStock = isActive && stock > 0;
        
        return {
          id: p.id,
          name: p.name,
          seller: p.sellerName || p.seller,
          sellerId: p.sellerId,
          price,
          unit: p.unit || '',
          category: cat,
          rating: readRating(p.id),
          reviews: readReviewCount(p.id),
          inStock: inStock,
          description: p.description || '',
          image: p.image ?? null,
          stock: stock,
          createdAt: p.createdAt ? Number(new Date(p.createdAt).valueOf()) : Date.now()
        } as Product;
      } catch (e) {
        console.error('Error enriching product:', e, p);
        return { id: p.id || String(Math.random()), name: p.name || 'Unnamed', seller: p.sellerName || p.seller || 'Unknown', price: 0, unit: '', category: p.category || '', rating: 0, reviews: 0, inStock: false, description: '', image: p.image ?? null, stock: p.stock || 0 } as Product;
      }
    };

    const refreshProducts = () => {
      try {
        const rawProducts = getMarketplaceProducts();
        console.log('[Marketplace] Raw products from storage:', rawProducts.length, rawProducts);
        
        const enriched = rawProducts.map(enrich);
        console.log('[Marketplace] Enriched products:', enriched.length, enriched);
        
        // Filter out any products that failed to enrich (have no name or invalid data)
        const validProducts = enriched.filter(p => p.name && p.id);
        console.log('[Marketplace] Valid products after filtering:', validProducts.length);
        
        setProducts(validProducts);
      } catch (error) {
        console.error('[Marketplace] Error refreshing products:', error);
        setProducts([]);
      }
    };

    refreshProducts();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'smartcow_marketplace_products' || e.key?.startsWith('smartcow_cp_products:')) {
        console.log('[Marketplace] Storage event detected:', e.key);
        try {
          refreshProducts();
        } catch (err) {
          console.error('[Marketplace] Error handling storage event:', err);
        }
      }
    };
    const onMarketplaceUpdate = () => {
      console.log('[Marketplace] Marketplace update event received');
      // Add a small delay to ensure localStorage is updated
      setTimeout(() => {
        refreshProducts();
      }, 50);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refreshProducts);
    window.addEventListener('smartcow_marketplace_updated', onMarketplaceUpdate as any);
    return () => { 
      window.removeEventListener('storage', onStorage); 
      window.removeEventListener('focus', refreshProducts); 
      window.removeEventListener('smartcow_marketplace_updated', onMarketplaceUpdate as any);
    };
  }, []);

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    console.log('[Marketplace] Filtering products:', {
      totalProducts: products.length,
      searchQuery: debouncedSearchQuery,
      selectedCategory,
      priceRange,
      availabilityFilter,
      userRole,
      userName
    });
    
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           product.seller.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

      const matchesAvailability = availabilityFilter === 'all' ||
                                 (availabilityFilter === 'in_stock' && product.inStock) ||
                                 (availabilityFilter === 'out_of_stock' && !product.inStock);

      // For sellers viewing "My Catalog", show only their products
      // Compost processors can see all products (they can buy from sellers too)
      // Match by sellerId (format: "seller:username" or "compost_processor:username")
      // The sellerId should exactly match the current user's ID format
      const currentUserId = userRole && (userName || 'anonymous') ? `${userRole}:${userName || 'anonymous'}` : null;
      const isOwnerView = userRole === 'seller'; // Only sellers see "My Catalog", CP sees full marketplace
      
      // Owner view (Seller): show only products belonging to this seller
      // Non-owner view (Buyer, CP, etc): show all products (but filter by inStock for availability)
      const matchesOwner = isOwnerView 
        ? (currentUserId && String(product.sellerId || '') === String(currentUserId))
        : true;
      
      // Status/availability check:
      // - For sellers viewing "My Catalog": show all their products (active and inactive)
      // - For others viewing marketplace: only show products that are in stock (active + stock > 0)
      const statusAllowed = isOwnerView 
        ? true  // Sellers can see all their products in "My Catalog"
        : product.inStock;  // Others only see in-stock products
      
      const passes = matchesSearch && matchesCategory && matchesPrice && matchesAvailability && matchesOwner && statusAllowed;
      
      // Debug logging for products that don't pass
      if (!passes && products.length <= 10) { // Only log if few products to avoid spam
        console.log('[Marketplace] Product filtered out:', {
          name: product.name,
          sellerId: product.sellerId,
          matchesSearch,
          matchesCategory: { selectedCategory, productCategory: product.category, matchesCategory },
          matchesPrice: { price: product.price, range: priceRange, matchesPrice },
          matchesAvailability: { availabilityFilter, inStock: product.inStock, matchesAvailability },
          matchesOwner: { isOwnerView, currentUserId, productSellerId: product.sellerId, matchesOwner },
          statusAllowed: { isOwnerView, inStock: product.inStock, statusAllowed }
        });
      }
      
      return passes;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'popularity':
          return b.reviews - a.reviews;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    console.log('[Marketplace] Filtered products result:', {
      beforeFilter: products.length,
      afterFilter: filtered.length,
      filters: {
        search: debouncedSearchQuery,
        category: selectedCategory,
        priceRange,
        availability: availabilityFilter,
        userRole,
        userName
      }
    });

    return filtered;
  }, [products, debouncedSearchQuery, selectedCategory, priceRange, availabilityFilter, sortBy, userRole, userName]);

  const addToCartLocal = (product: Product) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    addToCart(product as any);
  };

  const updateQuantityLocal = (productId: string, newQuantity: number) => updateQuantity(productId, newQuantity);

  const removeFromCartLocal = (productId: string) => removeFromCart(productId);

  const getTotalPrice = () => getTotal();

  const handleCheckout = () => {
    setCheckoutStep('payment');
  };

  const handlePayment = () => {
    const total = getTotalPrice();
    const id = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const cartSnapshot = cart.slice();
    setOrderSummary({ orderId: id, items: cartSnapshot as any, total, method: selectedPaymentMethod });
    setCountdown(3);
    setCheckoutStep('waiting');
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Payment succeeded: create order entries for each cart item
          try {
            const buyerId = `${userRole}:${userName || 'anonymous'}`;
            const buyerName = userName || 'Anonymous';
            cartSnapshot.forEach(item => {
              // item.price is already in IDR as shown in the marketplace
              const qty = item.quantity || 1;
              const totalIdr = Math.round(item.price * qty);
              // product.sellerId expected to be present from service
              const sellerId = (item as any).sellerId || `seller:${item.seller}`;
              createOrderForSeller({ productId: item.id, productName: item.name, sellerId, sellerName: item.seller, buyerId, buyerName, quantity: qty, totalIdr });
            });
          } catch (e) {
            // ignore order creation errors
          }
          clearCart();
          setCheckoutStep('success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetCheckout = () => {
    setCheckoutStep('cart');
    setSelectedPaymentMethod('');
    setProcessingProgress(0);
    setCountdown(0);
    setOrderSummary(null);
    clearCart();
    setView('browse');
  };

  const toggleFavorite = (productId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!userName || !userRole) return;
    const isLiked = favorites.has(productId);
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (isLiked) {
        newFavorites.delete(productId);
        removeLikedProduct(userId, productId);
      } else {
        newFavorites.add(productId);
        addLikedProduct(userId, productId);
      }
      return newFavorites;
    });
  };
  
  useEffect(() => {
    if (!userName || !userRole) return;
    const liked = getLikedProducts(userId);
    setFavorites(new Set(liked));
    
    const onLikedUpdate = (e: any) => {
      if (e.detail?.userId === userId) {
        const updated = getLikedProducts(userId);
        setFavorites(new Set(updated));
      }
    };
    
    window.addEventListener('smartcow_liked_products_updated', onLikedUpdate);
    return () => window.removeEventListener('smartcow_liked_products_updated', onLikedUpdate);
  }, [userId, userName, userRole]);

  const isAdmin = userRole === 'admin';
  const pageTitle = isAdmin ? 'Marketplace Overview' : (userRole === 'seller') ? 'My Catalog' : 'Marketplace';
  const headerTitle = isAdmin ? 'Marketplace Overview' : (userRole === 'seller') ? 'My Catalog' : 'Marketplace';
  const navigate = useNavigate();
  const isAuthenticated = !!userRole && !!userName;

  // Public layout wrapper for unauthenticated users
  const PublicLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl text-gray-900">Marketplace</span>
            </div>
            <Link to="/login">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-6">
                Login / Register
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );

  const content = (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">{headerTitle}</h1>
            <p className="text-gray-600">
              {isAdmin 
                ? 'Monitor marketplace activity, products, and transactions' 
                : 'Buy and sell cow waste, compost, and fertilizer materials'}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <div className="flex items-center px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-700">
                <Shield className="w-4 h-4 mr-2" />
                <span>Admin View - Monitoring Only</span>
              </div>
            )}
            {isAuthenticated && userRole !== 'seller' && !isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setView('cart')}
                  className="rounded-xl border-purple-200"
                >
                  <span className="inline-flex items-center">
                    <ShoppingCart className="w-5 h-5" />
                    {cart.length > 0 && (
                      <span className="ml-1 text-xs font-semibold text-gray-700">{cart.length}</span>
                    )}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-purple-200"
                  onClick={() => setView('saved')}
                >
                  <span className="inline-flex items-center">
                    <Heart className="w-5 h-5" />
                    {favorites.size > 0 && (
                      <span className="ml-1 text-xs font-semibold text-gray-700">{favorites.size}</span>
                    )}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-purple-200"
                  onClick={() => setView('orders')}
                >
                  Order Status
                </Button>
                <div className="hidden md:flex items-center px-3 py-2 rounded-xl border border-purple-200 text-sm text-gray-700">
                  <CreditCard className="w-4 h-4 mr-2 text-purple-600" />
                  <span>Saldo: {formatCustomIdr(balance)}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid md:grid-cols-4 gap-4"
        >
          <Card className="md:col-span-3 p-4 border-purple-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl border-purple-200"
              />
            </div>
          </Card>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="h-full rounded-xl border-purple-200"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </motion.div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Card className="p-6 border-purple-200">
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="raw_material">Cow Waste</SelectItem>
                        <SelectItem value="compost">Compost</SelectItem>
                        <SelectItem value="fertilizer">Fertilizer</SelectItem>
                        <SelectItem value="processed">Processed</SelectItem>
                        <SelectItem value="liquid_fertilizer">Liquid Fertilizer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Price Range (IDR)</Label>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={100000000}
                      min={0}
                      step={10000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>{formatCustomIdr(priceRange[0])}</span>
                      <span>{formatCustomIdr(priceRange[1])}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Availability</Label>
                    <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="price_low">Price: Low to High</SelectItem>
                        <SelectItem value="price_high">Price: High to Low</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="popularity">Popularity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setPriceRange([0, 100000000]);
                        setAvailabilityFilter('all');
                        setSortBy('name');
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Marketplace Statistics */}
        {isAdmin && view === 'browse' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="grid md:grid-cols-4 gap-4 mb-6"
          >
            <Card className="p-6 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Products</p>
                  <p className="text-2xl font-bold text-green-600">{products.filter(p => p.inStock).length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sellers</p>
                  <p className="text-2xl font-bold text-purple-600">{new Set(products.map(p => p.sellerId || p.seller)).size}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categories</p>
                  <p className="text-2xl font-bold text-indigo-600">{new Set(products.map(p => p.category)).size}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Main Content Views */}
        {view === 'browse' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white border border-purple-200 p-2 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg">All Products</TabsTrigger>
              <TabsTrigger value="raw_material" className="rounded-lg">Cow Waste</TabsTrigger>
              <TabsTrigger value="compost" className="rounded-lg">Compost</TabsTrigger>
              <TabsTrigger value="fertilizer" className="rounded-lg">Fertilizer</TabsTrigger>
              <TabsTrigger value="processed" className="rounded-lg">Processed</TabsTrigger>
            </TabsList>

            {/* Products Grid */}
            <TabsContent value={selectedCategory} className="mt-6">
              <motion.div
                layout
                className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                <AnimatePresence>
                  {filteredProducts.map(product => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ProductCard
                        product={product}
                        onAddToCart={addToCartLocal}
                        onViewDetails={setSelectedProduct}
                        isFavorite={favorites.has(product.id)}
                        onToggleFavorite={toggleFavorite}
                        isSeller={userRole === 'seller'}
                        isCompostProcessorOwnProduct={userRole === 'compost_processor' && (product.sellerId === `${userRole}:${userName || 'anonymous'}` || product.seller === (userName || 'Anonymous'))}
                        isAdmin={isAdmin}
                        isAuthenticated={isAuthenticated}
                        onLoginRequired={() => navigate('/login')}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {filteredProducts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No products found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
        )}

        {/* Product Detail Modal */}
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedProduct && (
            <ProductDetail
              product={selectedProduct}
              onAddToCart={addToCartLocal}
              onBuyNow={(product) => {
                if (!isAuthenticated) {
                  navigate('/login');
                  return;
                }
                if (isAdmin || userRole === 'seller' || (userRole === 'compost_processor' && (product.sellerId === `${userRole}:${userName || 'anonymous'}` || product.seller === (userName || 'Anonymous')))) return;
                setSelectedProduct(null);
                clearCart();
                addToCartLocal(product);
                setView('cart');
              }}
              isSeller={userRole === 'seller'}
              isCompostProcessorOwnProduct={userRole === 'compost_processor' && selectedProduct && (selectedProduct.sellerId === `${userRole}:${userName || 'anonymous'}` || selectedProduct.seller === (userName || 'Anonymous'))}
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
              onLoginRequired={() => navigate('/login')}
            />
            )}
          </DialogContent>
        </Dialog>

        {isAuthenticated && userRole !== 'seller' && view === 'cart' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CartPanel
              cart={cart}
              onUpdateQuantity={updateQuantityLocal}
              onRemoveItem={removeFromCartLocal}
              onProceedToPayment={() => {
                setPaymentCheckoutItems(cart);
                setPaymentError('');
                setView('payment');
              }}
              totalPrice={getTotalPrice()}
              onClose={() => setView('browse')}
            />
          </motion.div>
        )}

        {isAuthenticated && userRole !== 'seller' && view === 'payment' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card className="p-6 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-900 font-semibold">Payment</div>
                <div className="text-sm text-gray-700">Saldo: {formatCustomIdr(balance)}</div>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {paymentCheckoutItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-700">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatCustomIdr(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 border-t pt-3">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-semibold text-purple-600">
                  {formatCustomIdr(paymentCheckoutItems.reduce((t,i)=>t + i.price * i.quantity, 0))}
                </span>
              </div>
              {paymentError && (
                <div className="mt-3 p-3 border border-red-300 bg-red-50 text-red-700 rounded-lg text-sm">
                  {paymentError}
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={() => setView('cart')} className="flex-1">Back to Cart</Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const usdTotal = paymentCheckoutItems.reduce((t,i)=>t + i.price * i.quantity, 0);
                    const idrTotal = Math.round(usdTotal);
                    if (balance < idrTotal) {
                      setPaymentError('Saldo tidak mencukupi. Harap isi saldo.');
                      return;
                    }
                    setPaymentError('');
                    setView('processing');
                    setCountdown(3);
                    const id = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
                    const tracking = `TRK-ID-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
                    const timer = setInterval(() => {
                      setCountdown(prev => {
                        if (prev <= 1) {
                          clearInterval(timer);
                          setBalance(prevBal => prevBal - idrTotal);
                          setOrders(prev => {
                            const choices = ['Being Packed', 'In Delivery', 'Completed'] as const;
                            const statusChoice = choices[Math.floor(Math.random() * choices.length)] as 'Being Packed' | 'In Delivery' | 'Completed';
                            return [
                              {
                                id,
                                items: paymentCheckoutItems,
                                totalIdr: idrTotal,
                                status: statusChoice,
                                createdAt: Date.now(),
                                trackingNo: tracking
                              },
                              ...prev
                            ];
                          });
                          try {
                            paymentCheckoutItems.forEach(it => {
                              if (it.sellerId) {
                                const buyerId = `${userRole}:${userName || 'anonymous'}`;
                                const buyerName = userName || 'Anonymous';
                                createOrderForSeller({ productId: it.id, productName: it.name, sellerId: it.sellerId, sellerName: it.seller, buyerId, buyerName, quantity: it.quantity, totalIdr: Math.round(it.price * it.quantity) });
                              }
                            });
                          } catch {}
                          setView('payment-success');
                          return 0;
                        }
                        return prev - 1;
                      });
                    }, 1000);
                  }}
                >
                  Pay Now
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {isAuthenticated && userRole !== 'seller' && view === 'processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h3>
            <div className="text-3xl font-bold text-purple-600 mb-2">{countdown}s</div>
            <p className="text-sm text-gray-500">This is a demo checkout simulation.</p>
          </motion.div>
        )}

        {isAuthenticated && userRole !== 'seller' && view === 'payment-success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card className="p-6 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify.center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-xl font-semibold text-gray-900">Payment Successful</div>
              </div>
              <div className="text-sm text-gray-700 mb-3">Remaining balance: {formatCustomIdr(balance)}</div>
              <div className="space-y-2 text-sm text-gray-700">
                {paymentCheckoutItems.map(it => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.name} × {it.quantity}</span>
                    <span>{formatCustomIdr(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 border-t pt-3">
                <span className="text-sm text-gray-600">Total Paid</span>
                <span className="font-semibold text-purple-600">
                  {formatCustomIdr(paymentCheckoutItems.reduce((t,i)=>t + i.price * i.quantity, 0))}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {!currentRatingProduct && paymentCheckoutItems.length > 0 && (
                  <div>
                    <Button variant="outline" className="w-full" onClick={() => {
                      setCurrentRatingProduct(paymentCheckoutItems[0]);
                      setCurrentRating(0);
                    }}>
                      Give Rating
                    </Button>
                  </div>
                )}
                {currentRatingProduct && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Rate Your Purchase</h3>
                      <p className="text-sm text-gray-600 mt-1">{currentRatingProduct.name}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCurrentRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                          >
                            <Star
                              className={`w-10 h-10 ${
                                star <= currentRating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'fill-gray-200 text-gray-300'
                              } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                      {currentRating > 0 && (
                        <p className="text-center text-sm text-gray-600">
                          You rated {currentRating} {currentRating === 1 ? 'star' : 'stars'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCurrentRating(0);
                          // Move to next product if there are more
                          const currentIndex = paymentCheckoutItems.findIndex(p => p.id === currentRatingProduct.id);
                          if (currentIndex >= 0 && currentIndex < paymentCheckoutItems.length - 1) {
                            setCurrentRatingProduct(paymentCheckoutItems[currentIndex + 1]);
                            setCurrentRating(0);
                          } else {
                            setCurrentRatingProduct(null);
                          }
                        }}
                      >
                        Skip
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (currentRatingProduct && currentRating > 0) {
                            // Save rating
                            const ratings = JSON.parse(localStorage.getItem('smartcow_product_ratings') || '{}');
                            const productId = currentRatingProduct.id;
                            
                            if (!ratings[productId]) {
                              ratings[productId] = { ratings: [], count: 0, average: 0 };
                            }
                            
                            // Add new rating
                            ratings[productId].ratings.push(currentRating);
                            ratings[productId].count = ratings[productId].ratings.length;
                            // Calculate average
                            const sum = ratings[productId].ratings.reduce((a: number, b: number) => a + b, 0);
                            ratings[productId].average = Math.round((sum / ratings[productId].count) * 10) / 10;
                            
                            localStorage.setItem('smartcow_product_ratings', JSON.stringify(ratings));
                            setProductRatings(ratings);
                            
                            // Trigger refresh by dispatching storage event
                            window.dispatchEvent(new StorageEvent('storage', { 
                              key: 'smartcow_product_ratings',
                              newValue: JSON.stringify(ratings)
                            } as any));
                            
                            // Also trigger marketplace update
                            window.dispatchEvent(new CustomEvent('smartcow_marketplace_updated'));
                            
                            // Move to next product or close
                            const currentIndex = paymentCheckoutItems.findIndex(p => p.id === productId);
                            if (currentIndex >= 0 && currentIndex < paymentCheckoutItems.length - 1) {
                              setCurrentRatingProduct(paymentCheckoutItems[currentIndex + 1]);
                              setCurrentRating(0);
                            } else {
                              setCurrentRatingProduct(null);
                              setCurrentRating(0);
                            }
                          }
                        }}
                        disabled={currentRating === 0}
                      >
                        Submit Rating
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Button variant="outline" className="w-full" onClick={() => { 
                    setCurrentRatingProduct(null);
                    setCurrentRating(0);
                    clearCart(); 
                    setView('browse'); 
                  }}>
                    Return to Marketplace
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {isAuthenticated && userRole !== 'seller' && view === 'orders' && (
          <OrdersPanel orders={orders} onClose={() => setView('browse')} />
        )}

        {isAuthenticated && userRole !== 'seller' && view === 'saved' && (
          <SavedItemsPanel 
            favorites={favorites} 
            products={products}
            onToggleFavorite={(productId: string) => {
              if (favorites.has(productId)) {
                removeLikedProduct(userId, productId);
                setFavorites(prev => {
                  const next = new Set(prev);
                  next.delete(productId);
                  return next;
                });
              } else {
                addLikedProduct(userId, productId);
                setFavorites(prev => new Set(prev).add(productId));
              }
            }}
            onAddToCart={(product: Product) => {
              if (isAuthenticated) {
                addToCart(product);
              }
            }}
            onClose={() => setView('browse')}
            isAuthenticated={isAuthenticated}
            onLoginRequired={() => navigate('/login')}
          />
        )}


        {/* Removed List Product feature */}
      </motion.div>
  );

  // Use DashboardLayout if authenticated, otherwise use PublicLayout
  if (isAuthenticated) {
    return <DashboardLayout title={pageTitle}>{content}</DashboardLayout>;
  } else {
    return <PublicLayout>{content}</PublicLayout>;
  }
}

function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
  isFavorite,
  onToggleFavorite,
  isSeller,
  isCompostProcessorOwnProduct,
  isAdmin,
  isAuthenticated,
  onLoginRequired
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  isSeller: boolean;
  isCompostProcessorOwnProduct?: boolean;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
}) {
  return (
    <Card className="overflow-hidden border-purple-200 hover:border-purple-400 transition-all hover:shadow-xl group">
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 relative overflow-hidden">
        {product.image ? (
          <ImageWithFallback 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {product.category.includes('compost') ? (
              <Leaf className="w-20 h-20 text-green-600 opacity-30" />
            ) : product.category.includes('fertilizer') ? (
              <DollarSign className="w-20 h-20 text-purple-600 opacity-30" />
            ) : (
              <Package className="w-20 h-20 text-blue-600 opacity-30" />
            )}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/90 text-gray-700">{product.category}</Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-3 right-3 p-1 h-8 w-8 rounded-full bg-white/90 hover:bg-white"
          onClick={() => {
            if (isAuthenticated) {
              onToggleFavorite(product.id);
            } else if (onLoginRequired) {
              onLoginRequired();
            }
          }}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </Button>
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge className="bg-red-500 text-white text-lg px-4 py-2">Out of Stock</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{product.seller}</p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-700 ml-1">{product.rating}</span>
          </div>
          <span className="text-xs text-gray-500">({product.reviews} reviews)</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-2xl text-purple-600">Rp {formatPriceWithSeparator(product.price)}</div>
          <div className="text-xs text-gray-500">{product.unit}</div>
        </div>

        {!(isSeller || isCompostProcessorOwnProduct || isAdmin) && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl"
              disabled={!product.inStock}
              onClick={() => {
                if (isAuthenticated) {
                  onAddToCart(product);
                } else if (onLoginRequired) {
                  onLoginRequired();
                }
              }}
            >
              <ShoppingBag className="w-3 h-3 mr-1" />
              {product.inStock ? 'Add to Cart' : 'Unavailable'}
            </Button>
          </div>
        )}
        {isAdmin && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl py-2 px-3">
            <Shield className="w-4 h-4" />
            <span>View Only - Admin Mode</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function ProductDetail({ product, onAddToCart, onBuyNow, isSeller, isCompostProcessorOwnProduct, isAdmin, isAuthenticated, onLoginRequired }: { product: Product; onAddToCart: (product: Product) => void; onBuyNow: (product: Product) => void; isSeller: boolean; isCompostProcessorOwnProduct?: boolean; isAdmin?: boolean; isAuthenticated?: boolean; onLoginRequired?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        {/* Image */}
        <div className="w-1/2">
          <div className="h-96 bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 rounded-lg overflow-hidden relative">
            {product.image ? (
              <ImageWithFallback 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {product.category.includes('compost') ? (
                  <Leaf className="w-32 h-32 text-green-600 opacity-30" />
                ) : product.category.includes('fertilizer') ? (
                  <DollarSign className="w-32 h-32 text-purple-600 opacity-30" />
                ) : (
                  <Package className="w-32 h-32 text-blue-600 opacity-30" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="w-1/2 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
            <p className="text-gray-600 mb-4">{product.seller}</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg text-gray-700 ml-1">{product.rating}</span>
              </div>
              <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
            </div>
            <div className="text-3xl text-purple-600 mb-2">Rp {formatPriceWithSeparator(product.price)}</div>
            <div className="text-sm text-gray-500 mb-4">{product.unit}</div>
            <p className="text-gray-700 mb-6">{product.description}</p>
            <div className="flex items-center gap-4 mb-6">
              <Badge className="bg-purple-100 text-purple-700">{product.category}</Badge>
              <Badge className={product.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>
            {!isSeller && !isCompostProcessorOwnProduct && !isAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl py-3"
                  disabled={!product.inStock}
                  onClick={() => {
                    if (isAuthenticated) {
                      onAddToCart(product);
                    } else if (onLoginRequired) {
                      onLoginRequired();
                    }
                  }}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {product.inStock ? 'Add to Cart' : 'Unavailable'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl py-3 border-purple-200"
                  disabled={!product.inStock}
                  onClick={() => {
                    if (isAuthenticated) {
                      onBuyNow(product);
                    } else if (onLoginRequired) {
                      onLoginRequired();
                    }
                  }}
                >
                  Buy Now
                </Button>
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl py-3 px-4 border border-gray-200">
                <Shield className="w-4 h-4" />
                <span>Admin View - Purchase disabled</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartModal({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  checkoutStep,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  onPayment,
  processingProgress,
  countdown,
  orderSummary,
  onReset,
  setCheckoutStep
}: {
  cart: any[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  checkoutStep: string;
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: (method: string) => void;
  onPayment: () => void;
  processingProgress: number;
  countdown: number;
  orderSummary: {
    orderId: string;
    items: any[];
    total: number;
    method: string;
  } | null;
  onReset: () => void;
  setCheckoutStep: (step: string) => void;
}) {
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  if (checkoutStep === 'success') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Successful!</h3>
        {orderSummary && (
          <div className="text-left max-w-md mx-auto mb-6">
            <div className="mb-2 text-sm text-gray-600">Order ID</div>
            <div className="font-medium text-gray-900 mb-4">{orderSummary.orderId}</div>
            <div className="border rounded-lg p-4 mb-4">
                {orderSummary.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-700">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatCustomIdr(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-3 border-t pt-3 font-semibold">
                <span>Total</span>
                <span className="text-purple-600">{formatCustomIdr(orderSummary.total)}</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">Payment Method: {orderSummary.method}</div>
            </div>
          </div>
        )}
        <Button onClick={onReset} className="bg-green-600 hover:bg-green-700 text-white">
          Continue Shopping
        </Button>
      </div>
    );
  }

  if (checkoutStep === 'processing') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Truck className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Processing Payment...</h3>
        <Progress value={processingProgress} className="w-full mb-4" />
        <p className="text-gray-600">Please wait while we process your payment.</p>
      </div>
    );
  }

  if (checkoutStep === 'waiting') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Waiting for Payment</h3>
        <p className="text-gray-600 mb-4">Confirming your transaction...</p>
        <div className="text-3xl font-bold text-purple-600 mb-2">{countdown}s</div>
        <p className="text-sm text-gray-500">This is a demo. No real payment is processed.</p>
      </div>
    );
  }

  if (checkoutStep === 'payment') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Payment Method</h3>
        <div className="space-y-4">
          <div
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedPaymentMethod === 'card' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedPaymentMethod('card')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium">Credit/Debit Card</div>
                <div className="text-sm text-gray-500">Pay securely with your card</div>
              </div>
            </div>
          </div>
          <div
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedPaymentMethod === 'bank' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedPaymentMethod('bank')}
          >
            <div className="flex items-center gap-3">
              <Banknote className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium">Bank Transfer</div>
                <div className="text-sm text-gray-500">Direct bank transfer</div>
              </div>
            </div>
          </div>
          <div
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedPaymentMethod === 'ewallet' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedPaymentMethod('ewallet')}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium">E-Wallet</div>
                <div className="text-sm text-gray-500">Pay with digital wallet</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCheckoutStep('cart')} className="flex-1">
            Back to Cart
          </Button>
          <Button
            onClick={onPayment}
            disabled={!selectedPaymentMethod}
            variant="outline"
            className="flex-1"
          >
            Pay {formatCustomIdr(totalPrice)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Shopping Cart</h3>
      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">Your cart is empty</h4>
          <p className="text-gray-500">Add some products to get started!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                  {item.category.includes('compost') ? (
                    <Leaf className="w-8 h-8 text-green-600 opacity-50" />
                  ) : item.category.includes('fertilizer') ? (
                    <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
                  ) : (
                    <Package className="w-8 h-8 text-blue-600 opacity-50" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">{item.seller}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-purple-600">{formatCustomIdr(item.price * item.quantity)}</div>
                      <div className="text-sm text-gray-500">{formatCustomIdr(item.price)} each</div>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span className="text-purple-600">{formatCustomIdr(totalPrice)}</span>
            </div>
            <Button onClick={onCheckout} variant="outline" className="w-full mt-4">
              Proceed to Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ListProductModal({
  newProduct,
  setNewProduct,
  onAddProduct
}: {
  newProduct: {
    name: string;
    price: number;
    unit: string;
    category: string;
    description: string;
    stock: number;
  };
  setNewProduct: (product: {
    name: string;
    price: number;
    unit: string;
    category: string;
    description: string;
    stock: number;
  }) => void;
  onAddProduct: (product: {
    name: string;
    price: number;
    unit: string;
    category: string;
    description: string;
    stock: number;
  }) => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">List New Product</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Enter product name"
            />
          </div>
          <div>
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              step="any"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={newProduct.unit}
              onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              placeholder="e.g., per bag (25kg)"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={newProduct.category} onValueChange={(value: string) => setNewProduct({ ...newProduct, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Cow Waste</SelectItem>
                <SelectItem value="compost">Compost</SelectItem>
                <SelectItem value="fertilizer">Fertilizer</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="liquid_fertilizer">Liquid Fertilizer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={newProduct.description}
          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          placeholder="Describe your product..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows={4}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => onAddProduct(newProduct)}
          disabled={!newProduct.name || !newProduct.category || newProduct.price <= 0}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          List Product
        </Button>
      </div>
    </div>
  );
}
function CartPanel({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToPayment,
  totalPrice,
  onClose
}: {
  cart: any[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onProceedToPayment: () => void;
  totalPrice: number;
  onClose: () => void;
}) {
  return (
    <Card className="p-6 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Your Cart</h3>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">Your cart is empty</h4>
          <p className="text-gray-500">Add some products to get started!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                  {item.category.includes('compost') ? (
                    <Leaf className="w-8 h-8 text-green-600 opacity-50" />
                  ) : item.category.includes('fertilizer') ? (
                    <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
                  ) : (
                    <Package className="w-8 h-8 text-blue-600 opacity-50" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">{item.seller}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-purple-600">{formatCustomIdr(item.price * item.quantity)}</div>
                      <div className="text-sm text-gray-500">{formatCustomIdr(item.price)} each</div>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span className="text-purple-600">{formatCustomIdr(totalPrice)}</span>
            </div>
            <div className="mt-4 flex justify-center py-4">
              <Button
                onClick={onProceedToPayment}
                className="w-full max-w-xs !bg-blue-600 !text-white px-4 py-2 rounded-lg shadow hover:!bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function SavedItemsPanel({
  favorites,
  products,
  onToggleFavorite,
  onAddToCart,
  onClose,
  isAuthenticated,
  onLoginRequired
}: {
  favorites: Set<string>;
  products: Product[];
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onClose: () => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
}) {
  const savedProducts = products.filter(p => favorites.has(p.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saved Items</h2>
          <p className="text-gray-600 mt-1">Your favorite products</p>
        </div>
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          Back to Marketplace
        </Button>
      </div>

      {savedProducts.length === 0 ? (
        <Card className="p-12 border-purple-200 text-center">
          <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved items yet</h3>
          <p className="text-gray-600 mb-4">Start liking products to save them here</p>
          <Button onClick={onClose} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl">
            Browse Products
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProducts.map(product => (
            <Card key={product.id} className="p-4 border-purple-200 hover:border-purple-400 transition-colors">
              {product.image && (
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-start justify-between mb-2">
                <Badge className="bg-purple-100 text-purple-700">{product.category}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleFavorite(product.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Heart className={`w-5 h-5 ${favorites.has(product.id) ? 'fill-current' : ''}`} />
                </Button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2">By {product.seller}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-bold text-purple-600">
                  {formatCustomIdr(product.price)}/{product.unit}
                </span>
                <span className="text-sm text-gray-600">
                  {product.inStock ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>
              {product.inStock && (
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl"
                  onClick={() => {
                    if (isAuthenticated) {
                      onAddToCart(product);
                    } else if (onLoginRequired) {
                      onLoginRequired();
                    }
                  }}
                >
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  Add to Cart
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function OrdersPanel({ orders, onClose }: { orders: any[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-gray-900">Order Status</h2>
        <Button variant="outline" className="rounded-xl border-purple-200" onClick={onClose}>Back</Button>
      </div>
      {orders.length === 0 ? (
        <Card className="p-8 text-center border-purple-200">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <div className="text-gray-700">No orders yet</div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <Card key={order.id} className="p-6 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{order.id}</div>
                  <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                {order.status === 'Completed' ? (
                  <Badge className="bg-green-100 text-green-700">Completed</Badge>
                ) : order.status === 'In Delivery' ? (
                  <Badge className="bg-blue-100 text-blue-700">In Delivery</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700">Being Packed</Badge>
                )}
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {order.items.slice(0, 3).map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.name} × {it.quantity}</span>
                    <span>{formatCustomIdr(it.price * it.quantity)}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-xs text-gray-500">+{order.items.length - 3} more items</div>
                )}
              </div>
              <div className="flex justify-between mt-4 border-t pt-3">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-semibold text-purple-600">{formatCustomIdr(order.totalIdr)}</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">Tracking: {order.trackingNo}</div>
              <div className="mt-4">
                <Progress value={order.status === 'Being Packed' ? 33 : order.status === 'In Delivery' ? 66 : 100} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
