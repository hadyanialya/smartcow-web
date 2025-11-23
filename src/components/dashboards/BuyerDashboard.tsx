import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  ShoppingCart, Package, Star, MessageSquare
} from 'lucide-react';
import { formatCustomIdr, formatPriceWithSeparator } from '../../utils/currency';
import { useAuth } from '../../App';
import { getBuyerOrders, getLikedProducts, getMarketplaceProducts, removeLikedProduct } from '../../services/backend';
import { Link } from 'react-router-dom';

interface Order {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  totalIdr: number;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
}

export default function BuyerDashboard() {
  const { userRole, userName } = useAuth();
  const navigate = useNavigate();
  const userId = `${userRole}:${userName || 'anonymous'}`;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [savedProducts, setSavedProducts] = useState<any[]>([]);
  const [messagesCount, setMessagesCount] = useState(0);

  useEffect(() => {
    const refreshData = () => {
      // Get buyer orders
      const buyerOrders = getBuyerOrders(userId);
      setOrders(buyerOrders);

      // Get saved products
      const likedIds = getLikedProducts(userId);
      setSavedProductIds(likedIds);
      
      // Get product details for saved items
      const allProducts = getMarketplaceProducts();
      const saved = allProducts.filter(p => likedIds.includes(p.id));
      setSavedProducts(saved);

      // Count unread messages (simplified - you can enhance this)
      // For now, we'll just show a placeholder count
      setMessagesCount(0);
    };

    refreshData();

    // Listen for updates
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('smartcow_cp_orders:') || 
          e.key === 'smartcow_marketplace_products' ||
          e.key?.startsWith('smartcow_liked_products:')) {
        refreshData();
      }
    };

    const onUpdate = () => {
      setTimeout(refreshData, 50);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('smartcow_marketplace_updated', onUpdate as any);
    window.addEventListener('smartcow_liked_products_updated', onUpdate as any);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('smartcow_marketplace_updated', onUpdate as any);
      window.removeEventListener('smartcow_liked_products_updated', onUpdate as any);
    };
  }, [userId]);

  // Calculate stats
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const savedItemsCount = savedProductIds.length;

  const handleRemoveSaved = (productId: string) => {
    removeLikedProduct(userId, productId);
    setSavedProductIds(prev => prev.filter(id => id !== productId));
    setSavedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleBuyFromSaved = (product: any) => {
    navigate('/marketplace');
  };

  return (
    <DashboardLayout title="Buyer Dashboard">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6">
          <QuickStatCard
            icon={<ShoppingCart className="w-6 h-6" />}
            label="Active Orders"
            value={String(activeOrders)}
            color="from-blue-500 to-indigo-600"
          />
          <QuickStatCard
            icon={<Package className="w-6 h-6" />}
            label="Completed Orders"
            value={String(completedOrders)}
            color="from-green-500 to-emerald-600"
          />
          <QuickStatCard
            icon={<Star className="w-6 h-6" />}
            label="Saved Items"
            value={String(savedItemsCount)}
            color="from-purple-500 to-pink-600"
          />
          <QuickStatCard
            icon={<MessageSquare className="w-6 h-6" />}
            label="Messages"
            value={String(messagesCount)}
            color="from-orange-500 to-red-600"
          />
        </div>

        {/* Main Content */}
        <Card className="border-purple-200">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50 rounded-t-xl p-2">
              <TabsTrigger value="orders" className="rounded-lg">My Orders</TabsTrigger>
              <TabsTrigger value="saved" className="rounded-lg">Saved Items</TabsTrigger>
              <TabsTrigger value="messages" className="rounded-lg">Messages</TabsTrigger>
            </TabsList>

            {/* My Orders */}
            <TabsContent value="orders" className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-gray-900">Order History</h3>
                <Link to="/marketplace">
                  <Button variant="outline" className="rounded-xl border-purple-200">
                    Browse Marketplace
                  </Button>
                </Link>
              </div>
              
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">No orders yet</h4>
                  <p className="text-gray-500 mb-4">Start shopping to see your orders here</p>
                  <Link to="/marketplace">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl">
                      Go to Marketplace
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
                    <OrderHistoryCard
                      key={order.id}
                      orderId={order.id}
                      product={order.productName}
                      seller={order.sellerName}
                      quantity={`${order.quantity}`}
                      amount={formatCustomIdr(order.totalIdr)}
                      status={order.status === 'pending' ? 'confirmed' : order.status === 'processing' ? 'processing' : 'delivered'}
                      date={new Date(order.createdAt).toLocaleDateString()}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Saved Items */}
            <TabsContent value="saved" className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-gray-900">Your Saved Products</h3>
                <Link to="/marketplace">
                  <Button variant="outline" className="rounded-xl border-purple-200">
                    Browse Marketplace
                  </Button>
                </Link>
              </div>
              
              {savedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">No saved items</h4>
                  <p className="text-gray-500 mb-4">Save products from the marketplace to see them here</p>
                  <Link to="/marketplace">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl">
                      Go to Marketplace
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProducts.map(product => {
                    const status = String(product.status || '').trim();
                    const isActive = status === 'active';
                    const stock = Number(product.stock || 0);
                    const inStock = isActive && stock > 0;
                    
                    return (
                      <SavedProductCard
                        key={product.id}
                        name={product.name}
                        seller={product.sellerName || product.seller}
                        price={`Rp ${formatPriceWithSeparator(product.price)}/${product.unit || ''}`}
                        inStock={inStock}
                        onBuy={() => handleBuyFromSaved(product)}
                        onRemove={() => handleRemoveSaved(product.id)}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Messages */}
            <TabsContent value="messages" className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-gray-900">Messages</h3>
                <Link to="/chat">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl">
                    Open Chat
                  </Button>
                </Link>
              </div>
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-600 mb-2">Manage your messages</h4>
                <p className="text-gray-500 mb-4">Use the chat feature to communicate with sellers</p>
                <Link to="/chat">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl">
                    Go to Chat
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function QuickStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-6 border-purple-200">
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <div className="text-2xl text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </Card>
  );
}

function OrderHistoryCard({ orderId, product, seller, quantity, amount, status, date }: { 
  orderId: string; 
  product: string; 
  seller: string; 
  quantity: string; 
  amount: string; 
  status: string; 
  date: string;
}) {
  const statusConfig = {
    confirmed: { color: 'bg-blue-100 text-blue-700', label: 'Pending' },
    processing: { color: 'bg-yellow-100 text-yellow-700', label: 'Processing' },
    delivered: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed;

  return (
    <div className="p-4 bg-white rounded-xl border-2 border-purple-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-900 font-medium">{product}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>#{orderId.slice(0, 12)}</span>
            <span>•</span>
            <span>{seller}</span>
            <span>•</span>
            <span>{date}</span>
          </div>
        </div>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-600">Quantity: {quantity}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-900">{amount}</span>
          <Link to="/chat">
            <Button size="sm" variant="ghost" className="text-purple-600">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SavedProductCard({ 
  name, 
  seller, 
  price, 
  inStock, 
  onBuy, 
  onRemove 
}: { 
  name: string; 
  seller: string; 
  price: string; 
  inStock: boolean;
  onBuy: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="p-4 border-purple-200">
      <div className="w-full h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl mb-3 flex items-center justify-center">
        <Package className="w-10 h-10 text-purple-600" />
      </div>
      
      <h4 className="text-gray-900 mb-1 font-medium">{name}</h4>
      <p className="text-sm text-gray-600 mb-2">{seller}</p>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-purple-600 font-semibold">{price}</span>
        <Badge className={inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
          {inStock ? 'In Stock' : 'Out of Stock'}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg" 
          disabled={!inStock}
          onClick={onBuy}
        >
          Buy Now
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="rounded-lg text-red-600 border-red-200"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}
