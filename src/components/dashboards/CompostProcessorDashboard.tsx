import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Leaf, Package, TrendingUp, FileText, Plus, 
  Edit, Trash2, Eye, DollarSign
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { formatCustomIdr, formatPriceWithSeparator } from '../../utils/currency';
import { useAuth } from '../../App';
import { 
  getCpProducts, createCpProduct, updateCpProduct, deleteCpProduct,
  getCpArticles, createDraftArticle, updateArticle, submitArticleForApproval,
  getCpOrders, updateOrderStatus, getOverview,
  saveCpArticles, getMarketplaceProducts, autoUpdateOrderStatuses
} from '../../services/backend';

export default function CompostProcessorDashboard() {
  const { userRole, userName } = useAuth();
  const cpId = `${userRole}:${userName || 'anonymous'}`;
  const cpName = userName || 'Anonymous';

  const [overview, setOverview] = useState<{ totalProducts: number; totalSalesIdr: number; educationalPosts: number; inquiries: number }>({ totalProducts: 0, totalSalesIdr: 0, educationalPosts: 0, inquiries: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>(() => getCpArticles(cpId));
  const [orders, setOrders] = useState<Order[]>([]);
  const [marketplace, setMarketplace] = useState<Product[]>([]);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Fixed list of categories as per requirements
  const categories = ['raw_material', 'compost', 'fertilizer', 'processed'];

  const [productForm, setProductForm] = useState<any>({
    name: '', price: '', unit: '', category: 'compost', stock: 0, status: 'active', description: '', image: ''
  });

  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({
    title: '', 
    category: 'Composting', 
    content: '',
    cover: '',
    publishDate: 'Publish Now'
  });
  
  const CATEGORIES = ['Composting', 'Robotics', 'Waste Management', 'Agriculture Tips', 'Maintenance', 'Business', 'General'];
  const dateOptions = ['Publish Now', ...Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString();
  })];

  useEffect(() => {
    const productsKey = `smartcow_cp_products:${cpId}`;
    const articlesKey = `smartcow_cp_education:${cpId}`;
    const ordersKey = `smartcow_cp_orders:${cpId}`;

    const refreshData = async () => {
      try {
        const [productsData, ordersData, marketplaceData, overviewData] = await Promise.all([
          getCpProducts(cpId),
          getCpOrders(cpId),
          getMarketplaceProducts(),
          getOverview(cpId),
        ]);
        setProducts(productsData);
        setOrders(ordersData);
        setMarketplace(marketplaceData);
        setOverview(overviewData);
      } catch (error) {
        console.error('Error refreshing data:', error);
        // Fallback to sync versions
        const { getUsersSync } = await import('../../utils/auth');
        // Keep using localStorage as fallback
        const productsKey = `smartcow_cp_products:${cpId}`;
        const ordersKey = `smartcow_cp_orders:${cpId}`;
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
          const fallbackOverview = await getOverview(cpId);
          setOverview(fallbackOverview);
        } catch {}
      }
      setArticles(getCpArticles(cpId));
    };

    const onStorageOrUpdate = (e: StorageEvent | CustomEvent) => {
      if (!e) return;
      if (e instanceof StorageEvent && 
          (e.key === productsKey || e.key === articlesKey || e.key === ordersKey || e.key === 'smartcow_marketplace_products' || e.key?.startsWith('smartcow_revenue:') || e.key?.startsWith('smartcow_liked_products:'))) {
        refreshData();
      } else if (e instanceof CustomEvent && (e.type === 'smartcow_marketplace_updated' || e.type === 'smartcow_revenue_updated' || e.type === 'smartcow_liked_products_updated')) {
        refreshData();
      }
    };
  
    window.addEventListener('storage', onStorageOrUpdate);
    window.addEventListener('smartcow_marketplace_updated', onStorageOrUpdate);
    window.addEventListener('smartcow_revenue_updated', onStorageOrUpdate);
    window.addEventListener('smartcow_liked_products_updated', onStorageOrUpdate);

    refreshData();
    
    // Auto-update order statuses every minute
    const statusUpdateInterval = setInterval(async () => {
      await autoUpdateOrderStatuses();
      // Refresh orders after auto-update
      const updatedOrders = await getCpOrders(cpId);
      setOrders(updatedOrders);
    }, 60000); // Check every minute
    
    const poll = setInterval(async () => {
      const updatedOverview = await getOverview(cpId);
      setOverview(updatedOverview);
    }, 1000);

    return () => {
      window.removeEventListener('storage', onStorageOrUpdate);
      window.removeEventListener('smartcow_marketplace_updated', onStorageOrUpdate);
      window.removeEventListener('smartcow_revenue_updated', onStorageOrUpdate);
      window.removeEventListener('smartcow_liked_products_updated', onStorageOrUpdate);
      clearInterval(poll);
      clearInterval(statusUpdateInterval);
    };
  }, [cpId]);

  const startCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', unit: '', category: 'compost', stock: 0, status: 'active', description: '', image: '' });
    setShowProductForm(true);
  };
  const startEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, price: formatPriceWithSeparator(p.price), unit: p.unit, category: p.category, stock: p.stock, status: p.status, description: p.description, image: (p as any).image || '' });
    setShowProductForm(true);
  };
  
  const handlePriceChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setProductForm({ ...productForm, price: numericValue });
  };
  
  const handlePriceBlur = () => {
    if (productForm.price) {
      const num = parseFloat(productForm.price.toString().replace(/\./g, '')) || 0;
      setProductForm({ ...productForm, price: formatPriceWithSeparator(num) });
    }
  };
  
  const saveProduct = async () => {
    if (!productForm.name) return;
    const priceNum = Number(productForm.price.toString().replace(/\./g, '')) || 0;
    if (priceNum <= 0) return;
    const payload = { ...productForm, price: priceNum };
    if (editingProduct) {
      await updateCpProduct(cpId, editingProduct.id, payload);
    } else {
      await createCpProduct(cpId, cpName, payload);
    }
    // Force immediate refresh from backend - this ensures marketplace is synced
    const refreshAfterSave = async () => {
      try {
        const [updatedProducts, updatedMarketplace] = await Promise.all([
          getCpProducts(cpId),
          getMarketplaceProducts(),
        ]);
        setProducts(updatedProducts);
        setMarketplace(updatedMarketplace);
      } catch (error) {
        console.error('Error refreshing after save:', error);
        // Fallback
        const productsKey = `smartcow_cp_products:${cpId}`;
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
    const updatedOverview = await getOverview(cpId);
    setOverview(updatedOverview);
    // Dispatch events to ensure marketplace and other components update
    try { 
      window.dispatchEvent(new CustomEvent('smartcow_marketplace_updated', { detail: { cpId } } as any)); 
      // Also dispatch storage event for same-window listeners
      const productsKey = `smartcow_cp_products:${cpId}`;
      const marketplaceKey = 'smartcow_marketplace_products';
      const updatedProducts = await getCpProducts(cpId);
      const updatedMarketplace = await getMarketplaceProducts();
      window.dispatchEvent(new StorageEvent('storage', { key: productsKey, newValue: JSON.stringify(updatedProducts) } as any));
      window.dispatchEvent(new StorageEvent('storage', { key: marketplaceKey, newValue: JSON.stringify(updatedMarketplace) } as any));
    } catch {}
    setShowProductForm(false);
    setEditingProduct(null);
    toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');
  };
  const removeProduct = async (p: Product) => {
    await deleteCpProduct(cpId, p.id);
    const updatedProducts = await getCpProducts(cpId);
    setProducts(updatedProducts);
    const updatedOverview = await getOverview(cpId);
    setOverview(updatedOverview);
  };

  const startCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm({ title: '', category: 'Composting', content: '', cover: '', publishDate: 'Publish Now' });
    setShowArticleForm(true);
  };
  const startEditArticle = (a: Article) => {
    setEditingArticle(a);
    // Extract cover and publishDate from article if available (stored as metadata)
    const articleWithMeta = a as any;
    setArticleForm({ 
      title: a.title, 
      category: a.category, 
      content: a.content,
      cover: articleWithMeta.cover || '',
      publishDate: articleWithMeta.publishDate || 'Publish Now'
    });
    setShowArticleForm(true);
  };
  const saveArticle = async () => {
    if (!articleForm.title || !articleForm.category || !articleForm.content) {
      toast.error('Please fill in all required fields (Title, Category, and Content)');
      return;
    }
    let articleId: string;
    // Prepare article data (core fields)
    const articleData = {
      title: articleForm.title,
      category: articleForm.category,
      content: articleForm.content
    };
    
    if (editingArticle) {
      // Update article
      updateArticle(cpId, editingArticle.id, articleData);
      // Store metadata (cover, publishDate) as additional properties
      const updatedList = getCpArticles(cpId);
      const updatedArticle = updatedList.find(a => a.id === editingArticle.id);
      if (updatedArticle) {
        (updatedArticle as any).cover = articleForm.cover;
        (updatedArticle as any).publishDate = articleForm.publishDate === 'Publish Now' ? new Date().toLocaleDateString() : articleForm.publishDate;
        const next = updatedList.map(a => a.id === editingArticle.id ? updatedArticle : a);
        saveCpArticles(cpId, next);
      }
      articleId = editingArticle.id;
      setArticles(getCpArticles(cpId));
    } else {
      const created = createDraftArticle(cpId, cpName, articleData);
      // Store metadata (cover, publishDate) as additional properties
      const updatedList = getCpArticles(cpId);
      const updatedArticle = updatedList.find(a => a.id === created.id);
      if (updatedArticle) {
        (updatedArticle as any).cover = articleForm.cover;
        (updatedArticle as any).publishDate = articleForm.publishDate === 'Publish Now' ? new Date().toLocaleDateString() : articleForm.publishDate;
        const next = updatedList.map(a => a.id === created.id ? updatedArticle : a);
        saveCpArticles(cpId, next);
      }
      articleId = created.id;
      setArticles(getCpArticles(cpId));
    }
    // Submit article for approval - it will appear in admin content moderation
    (async () => {
      await submitArticleForApproval(cpId, articleId);
      setArticles(getCpArticles(cpId)); // Refresh to update status
    })();
    setShowArticleForm(false);
    setEditingArticle(null);
    const updatedOverview = await getOverview(cpId);
    setOverview(updatedOverview);
    toast.success(editingArticle ? 'Article updated and submitted for review' : 'Article created and submitted for review');
  };
  const submitArticle = async (a: Article) => {
    await submitArticleForApproval(cpId, a.id);
    setArticles(getCpArticles(cpId));
    const updatedOverview = await getOverview(cpId);
    setOverview(updatedOverview);
  };

  const completeOrder = async (order: Order) => {
    try {
      console.log(`🔄 Completing order: ${order.id}, cpId: ${cpId}`);
      await updateOrderStatus(cpId, order.id, 'completed');
      // Small delay to ensure revenue is saved to localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      // Force refresh all data immediately
      const updatedOrders = await getCpOrders(cpId);
      const updatedOverview = await getOverview(cpId);
      console.log(`📊 Updated overview after complete order:`, updatedOverview);
      setOrders(updatedOrders);
      setOverview(updatedOverview);
      toast.success(`Order completed — Revenue increased by ${formatCustomIdr(order.totalIdr)}`);
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Failed to complete order. Please try again.');
    }
  };

  return (
    <DashboardLayout title="Compost Processor Dashboard">
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-6">
          <OverviewCard
            icon={<Package className="w-6 h-6" />}
            label="Total Products"
            value={String(overview?.totalProducts ?? 0)}
            trend=""
            color="from-green-500 to-emerald-600"
          />
          <OverviewCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Total Revenue"
            value={formatCustomIdr(overview?.totalSalesIdr ?? 0)}
            trend=""
            color="from-blue-500 to-purple-600"
          />
          <OverviewCard
            icon={<FileText className="w-6 h-6" />}
            label="Educational Posts"
            value={String(overview?.educationalPosts ?? 0)}
            trend=""
            color="from-purple-500 to-pink-600"
          />
          <OverviewCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Inquiries"
            value={String(overview?.inquiries ?? 0)}
            trend=""
            color="from-orange-500 to-red-600"
          />
        </div>

        <Card className="border-purple-200">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50 rounded-t-xl p-2">
              <TabsTrigger value="products" className="rounded-lg">My Products</TabsTrigger>
              <TabsTrigger value="education" className="rounded-lg">Educational Content</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-lg">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-gray-900">Compost Products</h3>
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
                      <Select value={productForm.category} onValueChange={v=>setProductForm({ ...productForm, category: v })}>
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
                      <Select value={productForm.status} onValueChange={v=>setProductForm({ ...productForm, status: v as Product['status'] })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="inactive">inactive</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Input value={productForm.description} onChange={e=>setProductForm({ ...productForm, description: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={saveProduct} variant="outline" className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50">Save</Button>
                    <Button variant="outline" onClick={()=>{ setShowProductForm(false); setEditingProduct(null); }}>Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <ProductCard
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

            <TabsContent value="education" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-gray-900">Educational Articles</h3>
                <Button onClick={startCreateArticle} className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Article
                </Button>
              </div>

              {showArticleForm && (
                <Card className="p-6 border-purple-200">
                  <h3 className="text-lg text-gray-900 mb-4">{editingArticle ? 'Edit Article' : 'Create Article'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      value={articleForm.title} 
                      onChange={e=>setArticleForm({ ...articleForm, title: e.target.value })} 
                      placeholder="Title" 
                      className="rounded-xl" 
                    />
                    <div className="text-sm text-gray-600 flex items-center">
                      By {cpName}
                    </div>
                    <select 
                      className="rounded-xl border border-purple-200 p-2" 
                      value={articleForm.category} 
                      onChange={e=>setArticleForm({ ...articleForm, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                      className="rounded-xl border border-purple-200 p-2" 
                      value={articleForm.publishDate} 
                      onChange={e=>setArticleForm({ ...articleForm, publishDate: e.target.value })}
                    >
                      {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Input 
                      value={articleForm.cover} 
                      onChange={e=>setArticleForm({ ...articleForm, cover: e.target.value })} 
                      placeholder="Image URL" 
                      className="md:col-span-2 rounded-xl" 
                    />
                    <textarea 
                      value={articleForm.content} 
                      onChange={e=>setArticleForm({ ...articleForm, content: e.target.value })} 
                      className="md:col-span-2 h-40 rounded-xl border border-purple-200 p-3" 
                      placeholder="Article Content" 
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={saveArticle} className="rounded-xl">Save</Button>
                    <Button variant="outline" onClick={()=>{ setShowArticleForm(false); setEditingArticle(null); }} className="rounded-xl">Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-3">
                {articles.map(a => (
                  <ArticleCard
                    key={a.id}
                    title={a.title}
                    category={a.category}
                    views={String(a.views)}
                    date={new Date(a.createdAt).toLocaleDateString()}
                    status={a.status}
                    onEdit={()=>startEditArticle(a)}
                    onSubmit={a.status === 'draft' ? ()=>submitArticle(a) : undefined}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="orders" className="p-6 space-y-4">
              <h3 className="text-lg text-gray-900">Recent Orders</h3>
              <div className="space-y-3">
                {orders.filter(o => o.status !== 'completed' && o.status !== 'delivered').length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                    No pending orders
                  </div>
                )}
                {orders.filter(o => o.status !== 'completed' && o.status !== 'delivered').map(o => (
                  <OrderCard
                    key={o.id}
                    orderId={o.id}
                    product={o.productName}
                    buyer={o.buyerName}
                    quantity={`${o.quantity}`}
                    amount={formatCustomIdr(o.totalIdr)}
                    status={o.status}
                    onAdvanceStatus={()=>completeOrder(o)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function OverviewCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string; trend: string; color: string }) {
  return (
    <Card className="p-6 border-purple-200">
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <div className="text-2xl text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="text-xs text-green-600">{trend}</div>
    </Card>
  );
}

function ProductCard({ name, category, price, stock, status, onEdit, onDelete }: { name: string; category: string; price: string; stock: string; status: string; onEdit?: () => void; onDelete?: () => void }) {
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

function ArticleCard({ title, category, views, date, status, onEdit, onSubmit }: { title: string; category: string; views: string; date: string; status: string; onEdit?: () => void; onSubmit?: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-gray-900">{title}</h4>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <span>{category}</span>
            <span>•</span>
            <span>{date}</span>
            <span>•</span>
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              {views} views
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={status === 'published' ? 'bg-green-100 text-green-700' : status === 'pending' ? 'bg-blue-100 text-blue-700' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
          {status}
        </Badge>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        {onSubmit && (
          <Button size="sm" className="bg-purple-600 text-white" onClick={onSubmit}>Submit</Button>
        )}
      </div>
    </div>
  );
}

function OrderCard({ orderId, product, buyer, quantity, amount, status, onAdvanceStatus }: { orderId: string; product: string; buyer: string; quantity: string; amount: string; status: string; onAdvanceStatus?: () => void }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-purple-100">
      <div>
        <div className="text-gray-900 mb-1">{product}</div>
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          <span>{orderId}</span>
          <span>•</span>
          <span>{buyer}</span>
          <span>•</span>
          <span>{quantity}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-gray-900">{amount}</div>
        </div>
        <Badge className={statusColors[status as keyof typeof statusColors]}>
          {status}
        </Badge>
        {status !== 'completed' && status !== 'delivered' && onAdvanceStatus && (
          <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={onAdvanceStatus}>
            Order Completed
          </Button>
        )}
      </div>
    </div>
  );
}
