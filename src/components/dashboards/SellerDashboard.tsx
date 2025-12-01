import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Leaf, TrendingUp, Package, 
  Plus, Edit, Trash2, DollarSign
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { formatCustomIdr, formatPriceWithSeparator } from '../../utils/currency';
import { useAuth } from '../../App';
import { getCpProducts, createCpProduct, updateCpProduct, deleteCpProduct, getMarketplaceProducts, getCpOrders, updateOrderStatus, getOverview, getLikedProducts } from '../../services/backend';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export default function SellerDashboard() {
  const { userRole, userName } = useAuth();
  const sellerId = `${userRole}:${userName || 'anonymous'}`;
  const sellerName = userName || 'Anonymous';

  const [overview, setOverview] = useState<{ totalProducts: number; totalSalesIdr: number; educationalPosts: number; inquiries: number }>({ totalProducts: 0, totalSalesIdr: 0, educationalPosts: 0, inquiries: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [likedProductIds, setLikedProductIds] = useState<string[]>(() => getLikedProducts(sellerId));
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', unit: '', category: 'processed', stock: 0, status: 'active', description: '', image: ''
  });
  // Fixed list of categories as per requirements
  const categories = ['raw_material', 'compost', 'fertilizer', 'processed'];

  useEffect(() => {
    const productsKey = `smartcow_cp_products:${sellerId}`;
    const ordersKey = `smartcow_cp_orders:${sellerId}`;
  
    const refreshData = async () => {
      try {
        const [productsData, ordersData, marketplaceData, overviewData] = await Promise.all([
          getCpProducts(sellerId),
          getCpOrders(sellerId),
          getMarketplaceProducts(),
          getOverview(sellerId),
        ]);
        setProducts(productsData);
        setOrders(ordersData);
        setMarketplace(marketplaceData);
        setOverview(overviewData);
      } catch (error) {
        console.error('Error refreshing data:', error);
        // Fallback to localStorage
        const productsKey = `smartcow_cp_products:${sellerId}`;
        const ordersKey = `smartcow_cp_orders:${sellerId}`;
        const marketplaceKey = 'smartcow_marketplace_products';
        try {
          const productsJson = localStorage.getItem(productsKey);
          const ordersJson = localStorage.getItem(ordersKey);
          const marketplaceJson = localStorage.getItem(marketplaceKey);
          if (productsJson) setProducts(JSON.parse(productsJson));
          if (ordersJson) setOrders(JSON.parse(ordersJson));
          if (marketplaceJson) setMarketplace(JSON.parse(marketplaceJson));
        } catch {}
        // Fallback overview calculation
        try {
          const fallbackOverview = await getOverview(sellerId);
          setOverview(fallbackOverview);
        } catch {}
      }
      setLikedProductIds(getLikedProducts(sellerId));
    };
  
    // Because of TypeScript event listener signature issues with CustomEvent, use any on event parameter
    const onStorageOrUpdate = (e: any) => {
      if (!e) return;
      if (e instanceof StorageEvent && 
          (e.key === productsKey || e.key === ordersKey || e.key === 'smartcow_marketplace_products' || e.key?.startsWith('smartcow_revenue:') || e.key?.startsWith('smartcow_liked_products:'))) {
        refreshData();
      } else if (e.type === 'smartcow_marketplace_updated' || e.type === 'smartcow_revenue_updated' || e.type === 'smartcow_liked_products_updated') {
        refreshData();
      }
    };
  
    window.addEventListener('storage', onStorageOrUpdate);
    window.addEventListener('smartcow_marketplace_updated', onStorageOrUpdate);
    window.addEventListener('smartcow_revenue_updated', onStorageOrUpdate);
    window.addEventListener('smartcow_liked_products_updated', onStorageOrUpdate);
  
    refreshData();
  
    return () => {
      window.removeEventListener('storage', onStorageOrUpdate);
      window.removeEventListener('smartcow_marketplace_updated', onStorageOrUpdate);
      window.removeEventListener('smartcow_revenue_updated', onStorageOrUpdate);
      window.removeEventListener('smartcow_liked_products_updated', onStorageOrUpdate);
    };
  }, [sellerId]);

  const startCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', unit: '', category: 'processed', stock: 0, status: 'active', description: '', image: '' });
    setShowProductForm(true);
  };
  
  const handlePriceChange = (value: string) => {
    // Remove all non-numeric characters except dots (for formatting)
    const numericValue = value.replace(/[^\d]/g, '');
    setProductForm({ ...productForm, price: numericValue });
  };
  
  const handlePriceBlur = () => {
    // Format on blur
    if (productForm.price) {
      const num = parseFloat(productForm.price.replace(/\./g, '')) || 0;
      setProductForm({ ...productForm, price: formatPriceWithSeparator(num) });
    }
  };
  const startEditProduct = (p: any) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, price: formatPriceWithSeparator(p.price), unit: p.unit, category: p.category, stock: p.stock, status: p.status, description: p.description, image: p.image || '' });
    setShowProductForm(true);
  };
  const saveProduct = async () => {
    if (!productForm.name) return;
    // Remove dots and convert to number
    const priceNum = Number(productForm.price.toString().replace(/\./g, '')) || 0;
    if (priceNum <= 0) return;
    const payload = { ...productForm, price: priceNum };
    if (editingProduct) {
      await updateCpProduct(sellerId, editingProduct.id, payload as any);
    } else {
      await createCpProduct(sellerId, sellerName, payload as any);
    }
    // Force immediate refresh from backend - this ensures marketplace is synced
    const refreshAfterSave = async () => {
      try {
        const [updatedProducts, updatedMarketplace] = await Promise.all([
          getCpProducts(sellerId),
          getMarketplaceProducts(),
        ]);
        setProducts(updatedProducts);
        setMarketplace(updatedMarketplace);
      } catch (error) {
        console.error('Error refreshing after save:', error);
        // Fallback
        const productsKey = `smartcow_cp_products:${sellerId}`;
        const marketplaceKey = 'smartcow_marketplace_products';
        try {
          const productsJson = localStorage.getItem(productsKey);
          const marketplaceJson = localStorage.getItem(marketplaceKey);
          if (productsJson) setProducts(JSON.parse(productsJson));
          if (marketplaceJson) setMarketplace(JSON.parse(marketplaceJson));
        } catch {}
      }
    };
    await refreshAfterSave();
    const updatedOverview = await getOverview(sellerId);
    setOverview(updatedOverview);
    // Dispatch events to ensure marketplace and other components update
    try { 
      window.dispatchEvent(new CustomEvent('smartcow_marketplace_updated', { detail: { cpId: sellerId } } as any)); 
      // Also dispatch storage event for same-window listeners
      const productsKey = `smartcow_cp_products:${sellerId}`;
      const marketplaceKey = 'smartcow_marketplace_products';
      const updatedProducts = await getCpProducts(sellerId);
      const updatedMarketplace = await getMarketplaceProducts();
      window.dispatchEvent(new StorageEvent('storage', { key: productsKey, newValue: JSON.stringify(updatedProducts) } as any));
      window.dispatchEvent(new StorageEvent('storage', { key: marketplaceKey, newValue: JSON.stringify(updatedMarketplace) } as any));
    } catch {}
    setShowProductForm(false);
    setEditingProduct(null);
    toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');
  };
  const removeProduct = async (p: any) => {
    await deleteCpProduct(sellerId, p.id);
    const updatedProducts = await getCpProducts(sellerId);
    setProducts(updatedProducts);
    const updatedOverview = await getOverview(sellerId);
    setOverview(updatedOverview);
  };

  const completeOrder = async (order: any) => {
    try {
      await updateOrderStatus(sellerId, order.id, 'completed');
      // Force refresh all data immediately
      const updatedOrders = await getCpOrders(sellerId);
      const updatedOverview = await getOverview(sellerId);
      setOrders(updatedOrders);
      setOverview(updatedOverview);
      toast.success(`Order completed — Revenue increased by ${formatCustomIdr(order.totalIdr)}`);
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Failed to complete order. Please try again.');
    }
  };

  return (
    <DashboardLayout title="Seller Dashboard">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <StatCard
            icon={<Package className="w-6 h-6" />}
            label="Active Listings"
            value={String(products.length)}
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Total Revenue"
            value={formatCustomIdr(overview.totalSalesIdr)}
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Orders This Month"
            value={String(orders.length)}
            color="from-purple-500 to-pink-600"
          />
        </div>

        {/* Main Content */}
        <Card className="border-purple-200">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 rounded-t-xl p-2">
              <TabsTrigger value="products" className="rounded-lg">My Products</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-lg">Orders</TabsTrigger>
            </TabsList>

            {/* Products Management (Unified with Compost Processor) */}
            <TabsContent value="products" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-gray-900">Seller Products</h3>
                <Button onClick={startCreateProduct} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Product
                </Button>
              </div>

              {showProductForm && (
                <Card className="p-4 border-purple-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={productForm.name} onChange={e=>setProductForm({ ...productForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Price (IDR)</Label>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-l-md bg-gray-100 text-sm text-gray-700">Rp</span>
                        <Input
                          className="rounded-l-none flex-1"
                          type="text"
                          inputMode="numeric"
                          value={productForm.price}
                          onChange={e => handlePriceChange(e.target.value)}
                          onBlur={handlePriceBlur}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input value={productForm.unit} onChange={e=>setProductForm({ ...productForm, unit: e.target.value })} />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={productForm.category} onValueChange={(v: string)=>setProductForm({ ...productForm, category: v })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw_material">Cow Waste</SelectItem>
                          <SelectItem value="compost">Compost</SelectItem>
                          <SelectItem value="fertilizer">Fertilizer</SelectItem>
                          <SelectItem value="processed">Processed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input type="number" value={productForm.stock} onChange={e=>setProductForm({ ...productForm, stock: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={productForm.status} onValueChange={(v: string)=>setProductForm({ ...productForm, status: v as any })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="inactive">inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Input value={productForm.description} onChange={e=>setProductForm({ ...productForm, description: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Image URL</Label>
                      <Input value={productForm.image} onChange={e=>setProductForm({ ...productForm, image: e.target.value })} placeholder="https://..." />
                      {productForm.image && (
                        <div className="mt-3 w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-purple-200">
                          <ImageWithFallback 
                            src={productForm.image} 
                            alt="Product preview" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={saveProduct} variant="outline" className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50">Save</Button>
                    <Button variant="outline" className="rounded-xl" onClick={()=>{ setShowProductForm(false); setEditingProduct(null); }}>Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <SellerProductCard
                    key={p.id}
                    name={p.name}
                    category={p.category}
                    price={`Rp ${formatPriceWithSeparator(p.price)}/${p.unit || ''}`}
                    stock={p.stock > 0 ? `${p.stock}` : 'Out of stock'}
                    status={p.status}
                    onEdit={()=>startEditProduct(p)}
                    onDelete={()=>removeProduct(p)}
                  />
                ))}
              </div>
            </TabsContent>


            {/* Orders with revenue tracking */}
            <TabsContent value="orders" className="p-6 space-y-4">
              <h3 className="text-lg text-gray-900">Orders</h3>
              
              <div className="space-y-3">
                {orders.filter(o => o.status !== 'completed').length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                    No pending orders
                  </div>
                )}
                {orders.filter(o => o.status !== 'completed').map(o => (
                  <RequestCard
                    key={o.id}
                    requestId={o.id}
                    product={o.productName}
                    buyer={o.buyerName}
                    quantity={`${o.quantity}`}
                    amount={formatCustomIdr(o.totalIdr)}
                    status={o.status as any}
                    date={new Date(o.createdAt).toLocaleString()}
                    onAdvanceStatus={()=>completeOrder(o)}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Liked Products */}
            <TabsContent value="liked" className="p-6 space-y-4">
              <h3 className="text-lg text-gray-900">Liked Products</h3>
              
              <div className="space-y-3">
                {likedProductIds.length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                    No liked products yet. Like products in the marketplace to see them here.
                  </div>
                )}
                {likedProductIds.length > 0 && (() => {
                  const likedProducts = marketplace.filter(p => likedProductIds.includes(p.id));
                  
                  if (likedProducts.length === 0) {
                    return (
                      <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                        Liked products are no longer available in the marketplace.
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {likedProducts.map(p => (
                        <Card key={p.id} className="p-4 border-purple-200 hover:border-purple-400 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center">
                              <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <Badge className="bg-purple-100 text-purple-700">{p.category}</Badge>
                          </div>
                          <h4 className="text-gray-900 mb-1">{p.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{p.sellerName || p.seller}</p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-purple-600">Rp {formatPriceWithSeparator(p.price)}/{p.unit || ''}</span>
                            <span className="text-sm text-gray-600">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
            
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
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

function SellerProductCard({ name, category, price, stock, status, onEdit, onDelete }: { name: string; category: string; price: string; stock: string; status: string; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <Card className="p-4 border-purple-200 hover:border-purple-400 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <Badge className={status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
          {status}
        </Badge>
      </div>
      
      <h4 className="text-gray-900 mb-1">{name}</h4>
      <p className="text-sm text-gray-600 mb-3">{category}</p>
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-purple-600">{price}</span>
        <span className="text-sm text-gray-600">{stock}</span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={onEdit}>
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button size="sm" variant="outline" className="rounded-lg text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

function RequestCard({ requestId, product, buyer, quantity, amount, status, date, onAdvanceStatus }: { requestId: string; product: string; buyer: string; quantity: string; amount: string; status: string; date: string; onAdvanceStatus?: () => void }) {
  const statusConfig = {
    pending: { color: 'bg-blue-100 text-blue-700', label: 'New Request' },
    processing: { color: 'bg-purple-100 text-purple-700', label: 'Accepted' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  } as const;

  const config = statusConfig[status as keyof typeof statusConfig];

  return (
    <div className="p-4 bg-white rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-900">{product}</span>
            <Badge className={config.color}>{config.label}</Badge>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <span>{requestId}</span>
            <span>•</span>
            <span>{buyer}</span>
            <span>•</span>
            <span>{date}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg text-gray-900">{amount}</div>
          <div className="text-sm text-gray-600">{quantity}</div>
        </div>
      </div>

      {status !== 'completed' && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={onAdvanceStatus}>
            Order Completed
          </Button>
        </div>
      )}
    </div>
  );
}
