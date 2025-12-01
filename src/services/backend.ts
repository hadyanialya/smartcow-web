import { UserRole } from '../App';
import { supabase } from '../lib/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

type Id = string;

type Product = {
  id: Id;
  sellerId: string;
  sellerName: string;
  productOwnerRole?: 'seller' | 'compostProcessor';
  ownerUserId?: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  stock: number;
  status: 'active' | 'inactive';
  description: string;
  image?: string | null;
  createdAt: string;
};

type Article = {
  id: Id;
  authorId: string;
  authorName: string;
  title: string;
  category: string;
  content: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  views: number;
  createdAt: string;
};

type Order = {
  id: Id;
  productId: string;
  productName: string;
  sellerId: string;
  sellerRole?: 'seller' | 'compostProcessor';
  sellerName: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  totalIdr: number;
  status: 'pending' | 'processing' | 'packaging' | 'shipping' | 'delivered' | 'completed';
  createdAt: string;
  statusUpdatedAt?: string; // Timestamp when status was last updated
  revenueAdded?: boolean; // Track if revenue was already added for this order
};

type Overview = {
  totalProducts: number;
  totalSalesIdr: number;
  educationalPosts: number;
  inquiries: number;
};

const CP_PRODUCTS_PREFIX = 'smartcow_cp_products:';
const MARKETPLACE_PRODUCTS_KEY = 'smartcow_marketplace_products';
const CP_EDU_PREFIX = 'smartcow_cp_education:';
const PENDING_ARTICLES_KEY = 'smartcow_pending_articles';
const ARTICLES_STORAGE_KEY = 'smartcow_articles';
const CP_ORDERS_PREFIX = 'smartcow_cp_orders:';
const REVENUE_PREFIX = 'smartcow_revenue:'; // key: smartcow_revenue:<role>:<userId>
const CHAT_MESSAGES_KEY = 'smartcow_chat_messages';
const LIKED_PRODUCTS_PREFIX = 'smartcow_liked_products:'; // key: smartcow_liked_products:<userId>

function safeRead<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Ensure marketplace starts empty by default (explicit reset requirement)
// NOTE: Removed aggressive clearing of marketplace on module load so saved
// marketplace products persist across refreshes. Marketplace is now managed
// by `saveCpProducts` and other explicit actions.
export async function getCpProducts(cpId: string): Promise<Product[]> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', cpId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching products from Supabase:', error);
        // Fallback to localStorage
      } else if (data) {
        // Convert Supabase format to Product format
        return data.map((p: any) => ({
          id: p.id,
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          productOwnerRole: p.product_owner_role as 'seller' | 'compostProcessor' | undefined,
          ownerUserId: p.owner_user_id || undefined,
          name: p.name,
          price: Number(p.price),
          unit: p.unit,
          category: p.category,
          stock: p.stock,
          status: p.status as 'active' | 'inactive',
          description: p.description,
          image: p.image || null,
          createdAt: p.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getCpProducts Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  return safeRead<Product[]>(`${CP_PRODUCTS_PREFIX}${cpId}`, []);
}

export function saveCpProducts(cpId: string, list: Product[]) {
  // Step 1: Save to local storage (all products, active and inactive)
  // This is the seller's/compost-processor's complete product list
  // Storage key format: "smartcow_cp_products:seller:username" or "smartcow_cp_products:compost_processor:username"
  safeWrite(`${CP_PRODUCTS_PREFIX}${cpId}`, list);
  
  // Step 2: Update global marketplace with ONLY active products
  // The marketplace should only show active products from all sellers/compost-processors
  // CRITICAL: Filter by exact string match 'active' (case-sensitive)
  const activeProducts = list.filter(p => {
    // Ensure status is exactly 'active' (handle any edge cases)
    const status = String(p.status || '').toLowerCase().trim();
    return status === 'active';
  });
  
  // Step 3: Get current global marketplace and remove this seller's/compost-processor's old products
  // CRITICAL: Use exact string match for sellerId comparison
  // sellerId format must match cpId exactly: "seller:username" or "compost_processor:username"
  const global = safeRead<Product[]>(MARKETPLACE_PRODUCTS_KEY, []);
  const others = global.filter(p => {
    // Exact string comparison - both must be the same format
    return String(p.sellerId || '') !== String(cpId);
  });
  
  // Step 4: Merge: keep other sellers' products + add this seller's/compost-processor's active products
  // This ensures all active products from all sellers/compost-processors are in the marketplace
  const nextGlobal = [...others, ...activeProducts];
  
  // Step 5: Deduplicate by product ID (keep latest version)
  // This prevents duplicate products if the same product is added multiple times
  const deduped: Product[] = [];
  const seen = new Set<string>();
  for (const p of nextGlobal) {
    if (p.id && !seen.has(p.id)) {
      deduped.push(p);
      seen.add(p.id);
    }
  }
  
  // Step 6: Save updated global marketplace
  // This is the single source of truth for all active products in the marketplace
  safeWrite(MARKETPLACE_PRODUCTS_KEY, deduped);
  
  // Step 7: Dispatch events to notify all components (Marketplace, Catalogs, etc.)
  // This ensures UI components refresh immediately when products are added/updated
  try {
    try { window.dispatchEvent(new CustomEvent('smartcow_marketplace_updated', { detail: { cpId } })); } catch {}
    try { window.dispatchEvent(new Event('smartcow_marketplace_updated')); } catch {}
    try {
      const se = new StorageEvent('storage', { key: MARKETPLACE_PRODUCTS_KEY, newValue: JSON.stringify(deduped) } as any);
      window.dispatchEvent(se);
    } catch {}
  } catch {}
}

export async function createCpProduct(cpId: string, cpName: string, data: Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'createdAt'>): Promise<Product> {
  // Only Seller and Compost Processor roles are allowed to create products
  if (!cpId.startsWith('seller:') && !cpId.startsWith('compost_processor:')) {
    throw new Error('Only Seller or Compost Processor can create products');
  }
  
  // Read current products from local storage (per-seller/compost-processor storage)
  const list = await getCpProducts(cpId);
  
  // Derive role and userId from cpId
  // cpId format: "seller:username" or "compost_processor:username"
  const [rolePart, ...rest] = cpId.split(':');
  const role = rolePart === 'seller' ? 'seller' : (rolePart === 'compost_processor' ? 'compostProcessor' : undefined);
  const userId = rest.join(':') || cpId;
  
  // Ensure status is explicitly set to 'active' for new products (default behavior)
  // This is CRITICAL - only 'active' products appear in the global marketplace
  const finalStatus = data.status === 'inactive' ? 'inactive' : 'active';
  
  // Create the product with all required fields
  // IMPORTANT: sellerId must exactly match cpId format for filtering to work correctly
  const item: Product = { 
    id: `prod-${Date.now()}`, 
    sellerId: cpId,  // Must be exact format: "compost_processor:username" or "seller:username"
    sellerName: cpName, 
    productOwnerRole: role, 
    ownerUserId: userId, 
    createdAt: new Date().toISOString(), 
    ...data,  // Spread fields from data first
    status: finalStatus,  // Override status AFTER spread to ensure it's always 'active' (unless explicitly 'inactive')
  };
  
  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: supabaseData, error } = await supabase
        .from('products')
        .insert({
          seller_id: cpId,
          seller_name: cpName,
          product_owner_role: role || null,
          owner_user_id: userId || null,
          name: item.name,
          price: item.price,
          unit: item.unit,
          category: item.category,
          stock: item.stock,
          status: item.status,
          description: item.description,
          image: item.image || null,
          created_at: item.createdAt,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving product to Supabase:', error);
        // Continue with localStorage save even if Supabase fails
      } else if (supabaseData) {
        // Update item with Supabase ID
        item.id = supabaseData.id;
      }
    } catch (error) {
      console.error('Error in createCpProduct Supabase:', error);
      // Continue with localStorage save even if Supabase fails
    }
  }
  
  // Add to local list and save (this will also update the global marketplace)
  const next = [item, ...list];
  saveCpProducts(cpId, next);
  
  return item;
}

export async function updateCpProduct(cpId: string, id: string, patch: Partial<Product>) {
  const list = await getCpProducts(cpId);
  const updatedProduct = list.find(p => p.id === id);
  if (!updatedProduct) return;
  
  const next = list.map(p => p.id === id ? { ...p, ...patch } : p);
  const finalProduct = { ...updatedProduct, ...patch };
  
  // Update in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      // Check if product ID is UUID (from Supabase) or timestamp-based (from localStorage)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        // Product exists in Supabase, update it
        const { error } = await supabase
          .from('products')
          .update({
            name: finalProduct.name,
            price: finalProduct.price,
            unit: finalProduct.unit,
            category: finalProduct.category,
            stock: finalProduct.stock,
            status: finalProduct.status,
            description: finalProduct.description,
            image: finalProduct.image || null,
          })
          .eq('id', id);
        
        if (error) {
          console.error('Error updating product in Supabase:', error);
        }
      } else {
        // Product only exists in localStorage, try to find it in Supabase by seller_id and name
        // or create new entry
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', cpId)
          .eq('name', finalProduct.name)
          .single();
        
        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('products')
            .update({
              name: finalProduct.name,
              price: finalProduct.price,
              unit: finalProduct.unit,
              category: finalProduct.category,
              stock: finalProduct.stock,
              status: finalProduct.status,
              description: finalProduct.description,
              image: finalProduct.image || null,
            })
            .eq('id', existing.id);
          
          if (error) {
            console.error('Error updating product in Supabase:', error);
          } else {
            // Update local ID to match Supabase ID
            const nextWithId = next.map(p => p.id === id ? { ...p, id: existing.id } : p);
            saveCpProducts(cpId, nextWithId);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error in updateCpProduct Supabase:', error);
    }
  }
  
  saveCpProducts(cpId, next);
  // saveCpProducts already dispatches events, but we'll ensure it's done here too
}

export async function deleteCpProduct(cpId: string, id: string) {
  const list = await getCpProducts(cpId);
  const next = list.filter(p => p.id !== id);
  
  // Delete from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Error deleting product from Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error in deleteCpProduct Supabase:', error);
    }
  }
  
  saveCpProducts(cpId, next);
}

export async function getMarketplaceProducts(): Promise<Product[]> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching marketplace products from Supabase:', error);
        // Fallback to localStorage
      } else if (data) {
        // Convert Supabase format to Product format
        return data.map((p: any) => ({
          id: p.id,
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          productOwnerRole: p.product_owner_role as 'seller' | 'compostProcessor' | undefined,
          ownerUserId: p.owner_user_id || undefined,
          name: p.name,
          price: Number(p.price),
          unit: p.unit,
          category: p.category,
          stock: p.stock,
          status: p.status as 'active' | 'inactive',
          description: p.description,
          image: p.image || null,
          createdAt: p.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getMarketplaceProducts Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  return safeRead<Product[]>(MARKETPLACE_PRODUCTS_KEY, []);
}

export function getCpArticles(cpId: string): Article[] {
  return safeRead<Article[]>(`${CP_EDU_PREFIX}${cpId}`, []);
}

export function saveCpArticles(cpId: string, list: Article[]) {
  safeWrite(`${CP_EDU_PREFIX}${cpId}`, list);
}

export function createDraftArticle(cpId: string, cpName: string, data: Omit<Article, 'id' | 'authorId' | 'authorName' | 'status' | 'views' | 'createdAt'>): Article {
  const list = getCpArticles(cpId);
  const item: Article = { id: `art-${Date.now()}`, authorId: cpId, authorName: cpName, status: 'draft', views: 0, createdAt: new Date().toISOString(), ...data };
  const next = [item, ...list];
  saveCpArticles(cpId, next);
  return item;
}

export function updateArticle(cpId: string, id: string, patch: Partial<Article>) {
  const list = getCpArticles(cpId);
  const next = list.map(a => a.id === id ? { ...a, ...patch } : a);
  saveCpArticles(cpId, next);
}

export async function submitArticleForApproval(cpId: string, id: string) {
  const list = getCpArticles(cpId);
  const a = list.find(x => x.id === id);
  if (!a) return;
  a.status = 'pending';
  saveCpArticles(cpId, list);
  
  // Extract additional metadata (cover, publishDate) if available
  const articleWithMeta = a as any;
  const payload = { 
    id: a.id, 
    title: a.title, 
    author: a.authorName || a.authorId?.split(':')[1] || 'Unknown',
    authorId: a.authorId, 
    category: a.category, 
    content: a.content || '',
    cover: articleWithMeta.cover || '',
    publishDate: articleWithMeta.publishDate || new Date().toLocaleDateString(),
    submittedAt: new Date().toISOString() 
  };
  
  // Save to Supabase pending_articles table if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseArticles = await import('./supabaseArticles');
      // Check if article already exists in pending (by title and author)
      const existingPending = await supabaseArticles.getPendingArticles();
      const existing = existingPending.find(p => p.title === a.title && p.authorId === a.authorId);
      
      if (!existing) {
        // Create new pending article in Supabase
        await supabaseArticles.createPendingArticle({
          authorId: a.authorId,
          authorName: a.authorName,
          title: a.title,
          content: a.content || '',
          category: a.category,
        });
      }
    } catch (error) {
      console.error('Error submitting article to Supabase:', error);
      // Continue with localStorage save as fallback
    }
  }
  
  // Also save to localStorage as backup
  const pending = safeRead<any[]>(PENDING_ARTICLES_KEY, []);
  const existingIndex = pending.findIndex(p => p.id === a.id);
  if (existingIndex >= 0) {
    // Update existing pending article
    pending[existingIndex] = payload;
    safeWrite(PENDING_ARTICLES_KEY, pending);
  } else {
    // Add new pending article
    safeWrite(PENDING_ARTICLES_KEY, [payload, ...pending]);
  }
  
  // Trigger storage event for admin dashboard to refresh
  window.dispatchEvent(new StorageEvent('storage', { 
    key: PENDING_ARTICLES_KEY,
    newValue: JSON.stringify(existingIndex >= 0 ? pending : [payload, ...pending])
  } as any));
}

export function publishApprovedArticle(a: { id: string; authorId?: string }) {
  const saved = safeRead<Article[]>(ARTICLES_STORAGE_KEY, []);
  safeWrite(ARTICLES_STORAGE_KEY, saved);
  if (a.authorId) {
    const list = getCpArticles(a.authorId);
    const next = list.map(x => x.id === a.id ? { ...x, status: 'published' as const } : x);
    saveCpArticles(a.authorId, next);
  }
}

export function rejectArticleUpdate(a: { id: string; authorId?: string }) {
  if (a.authorId) {
    const list = getCpArticles(a.authorId);
    const next = list.map(x => x.id === a.id ? { ...x, status: 'rejected' as const } : x);
    saveCpArticles(a.authorId, next);
  }
}

export function incrementArticleView(articleId: string) {
  const all = safeRead<Article[]>(ARTICLES_STORAGE_KEY, []);
  const nextAll = all.map(a => a.id === articleId ? { ...a, views: (a.views || 0) + 1 } as Article : a);
  safeWrite(ARTICLES_STORAGE_KEY, nextAll);
}

export async function getCpOrders(cpId: string): Promise<Order[]> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', cpId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders from Supabase:', error);
        // Fallback to localStorage
      } else if (data) {
        // Convert Supabase format to Order format
        return data.map((o: any) => ({
          id: o.id,
          productId: o.product_id || '',
          productName: o.product_name,
          sellerId: o.seller_id,
          sellerRole: o.seller_role as 'seller' | 'compostProcessor' | undefined,
          sellerName: o.seller_name,
          buyerId: o.buyer_id,
          buyerName: o.buyer_name,
          quantity: o.quantity,
          totalIdr: Number(o.total_idr),
          status: o.status as 'pending' | 'processing' | 'packaging' | 'shipping' | 'delivered' | 'completed',
          createdAt: o.created_at,
          statusUpdatedAt: o.status_updated_at || o.created_at,
          revenueAdded: o.revenue_added || false,
        }));
      }
    } catch (error) {
      console.error('Error in getCpOrders Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  return safeRead<Order[]>(`${CP_ORDERS_PREFIX}${cpId}`, []);
}

// Get all orders for a buyer by searching through all seller/processor orders
export async function getBuyerOrders(buyerId: string): Promise<Order[]> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching buyer orders from Supabase:', error);
        // Fallback to localStorage
      } else if (data) {
        // Convert Supabase format to Order format
        return data.map((o: any) => ({
          id: o.id,
          productId: o.product_id || '',
          productName: o.product_name,
          sellerId: o.seller_id,
          sellerRole: o.seller_role as 'seller' | 'compostProcessor' | undefined,
          sellerName: o.seller_name,
          buyerId: o.buyer_id,
          buyerName: o.buyer_name,
          quantity: o.quantity,
          totalIdr: Number(o.total_idr),
          status: o.status as 'pending' | 'processing' | 'packaging' | 'shipping' | 'delivered' | 'completed',
          createdAt: o.created_at,
          statusUpdatedAt: o.status_updated_at || o.created_at,
          revenueAdded: o.revenue_added || false,
        }));
      }
    } catch (error) {
      console.error('Error in getBuyerOrders Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const allOrders: Order[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CP_ORDERS_PREFIX)) {
        const orders = safeRead<Order[]>(key, []);
        // Filter orders that belong to this buyer
        const buyerOrders = orders.filter(order => order.buyerId === buyerId);
        allOrders.push(...buyerOrders);
      }
    }
  } catch (error) {
    console.error('Error getting buyer orders:', error);
  }
  // Sort by creation date, newest first
  return allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveCpOrders(cpId: string, list: Order[]) {
  safeWrite(`${CP_ORDERS_PREFIX}${cpId}`, list);
}

export async function createOrderForSeller(item: { productId: string; productName: string; sellerId: string; sellerName: string; buyerId: string; buyerName: string; quantity: number; totalIdr: number; }) {
  // infer sellerRole from sellerId prefix
  const sellerRole = item.sellerId && item.sellerId.startsWith('seller:') ? 'seller' : item.sellerId && item.sellerId.startsWith('compost_processor:') ? 'compostProcessor' : undefined;
  
  let orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  
  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      // Check if productId is UUID (from Supabase) or timestamp-based
      const isProductUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
      
      const { data, error } = await supabase
        .from('orders')
        .insert({
          product_id: isProductUUID ? item.productId : null,
          product_name: item.productName,
          seller_id: item.sellerId,
          seller_role: sellerRole || null,
          seller_name: item.sellerName,
          buyer_id: item.buyerId,
          buyer_name: item.buyerName,
          quantity: item.quantity,
          total_idr: item.totalIdr,
          status: 'packaging', // Try packaging first
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        // If packaging fails due to constraint, try with 'pending' instead
        if (error.code === '23514' && error.message?.includes('orders_status_check')) {
          console.warn('Status "packaging" not allowed in constraint, using "pending" instead. Please run update-orders-status-constraint.sql in Supabase.');
          try {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('orders')
              .insert({
                product_id: isProductUUID ? item.productId : null,
                product_name: item.productName,
                seller_id: item.sellerId,
                seller_role: sellerRole || null,
                seller_name: item.sellerName,
                buyer_id: item.buyerId,
                buyer_name: item.buyerName,
                quantity: item.quantity,
                total_idr: item.totalIdr,
                status: 'pending', // Fallback to pending
                created_at: new Date().toISOString(),
              })
              .select()
              .single();
            
            if (fallbackError) {
              console.error('Error creating order in Supabase (fallback):', fallbackError);
            } else if (fallbackData) {
              orderId = fallbackData.id;
            }
          } catch (fallbackErr) {
            console.error('Error in fallback order creation:', fallbackErr);
          }
        } else {
          console.error('Error creating order in Supabase:', error);
        }
        // Continue with localStorage save even if Supabase fails
      } else if (data) {
        orderId = data.id;
      }
    } catch (error) {
      console.error('Error in createOrderForSeller Supabase:', error);
      // Continue with localStorage save even if Supabase fails
    }
  }
  
  const now = new Date().toISOString();
  // Determine order status: if orderId is UUID from Supabase, check if we used fallback
  // For localStorage, always use 'packaging' to match expected behavior
  const isSupabaseOrder = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  // If Supabase insert succeeded, status might be 'pending' (if fallback was used) or 'packaging' (if constraint allows)
  // We'll check the actual status from Supabase if possible, otherwise default to 'packaging' for localStorage
  const orderStatus: Order['status'] = 'packaging'; // Default to packaging for localStorage consistency
  
  const order: Order = { 
    id: orderId, 
    productId: item.productId, 
    productName: item.productName, 
    sellerId: item.sellerId, 
    sellerRole, 
    sellerName: item.sellerName, 
    buyerId: item.buyerId, 
    buyerName: item.buyerName, 
    quantity: item.quantity, 
    totalIdr: item.totalIdr, 
    status: orderStatus,
    createdAt: now,
    statusUpdatedAt: now
  };
  
  // After creating order, try to update to 'packaging' if constraint allows
  if (isSupabaseConfigured() && orderStatus === 'pending') {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      if (isUUID) {
        // Try to update to packaging (will fail silently if constraint doesn't allow)
        await supabase
          .from('orders')
          .update({ status: 'packaging' })
          .eq('id', orderId);
      }
    } catch {
      // Ignore if update fails
    }
  }
  
  const list = await getCpOrders(item.sellerId);
  const next = [order, ...list];
  saveCpOrders(item.sellerId, next);
  sendSystemMessage(item.sellerId, item.buyerId, `New order: ${order.productName} × ${order.quantity}`);
}

export async function updateOrderStatus(cpId: string, orderId: string, status: Order['status']) {
  // Update in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      
      if (isUUID) {
        // Update status and revenueAdded flag if revenue was added
        const updateData: any = { status };
        // Note: revenueAdded will be set after we check if revenue should be added
        // We'll update it in the next block after revenueAdded is determined
        
        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);
        
        if (error) {
          console.error('Error updating order status in Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error in updateOrderStatus Supabase:', error);
    }
  }
  
  const list = await getCpOrders(cpId);
  let orderFound = false;
  let revenueAdded = false;
  
  console.log(`🔄 updateOrderStatus: cpId=${cpId}, orderId=${orderId}, status=${status}`);
  console.log(`📦 Found ${list.length} orders for ${cpId}`);
  
  const next = list.map(o => {
    if (o.id !== orderId) return o;
    orderFound = true;
    
    // if transitioning to completed from a non-completed state, add revenue
    const wasCompleted = o.status === 'completed';
    const updated = { ...o, status } as Order;
    
    console.log(`📋 Order found: id=${o.id}, currentStatus=${o.status}, newStatus=${status}, wasCompleted=${wasCompleted}`);
    console.log(`📋 Order details: sellerId=${o.sellerId}, sellerRole=${o.sellerRole}, totalIdr=${o.totalIdr}`);
    
    // Add revenue when transitioning from non-completed to completed
    // OR if order is already completed but revenue hasn't been added yet
    if (status === 'completed') {
      // Ensure this order belongs to the cpId (seller/processor) making the update
      if (o.sellerId !== cpId) {
        console.warn(`⚠️ Order ${orderId} sellerId (${o.sellerId}) does not match cpId (${cpId})`);
        return updated; // Don't add revenue if order doesn't belong to this seller/processor
      }
      
      // Check if revenue was already added for this order
      if (o.revenueAdded) {
        console.log(`ℹ️ Revenue already added for order ${orderId}. Skipping.`);
        return updated;
      }
      
      // Determine role and userId from the order's sellerId
      const sellerId = o.sellerId;
      const sellerRole = o.sellerRole || (sellerId && sellerId.startsWith('seller:') ? 'seller' : sellerId && sellerId.startsWith('compost_processor:') ? 'compostProcessor' : undefined);
      
      // Extract userId from sellerId (format: 'seller:username' or 'compost_processor:username')
      let userId: string | undefined;
      if (sellerId && sellerId.includes(':')) {
        userId = sellerId.split(':').slice(1).join(':');
      } else {
        userId = sellerId;
      }
      
      console.log(`🔍 Extracted: sellerId=${sellerId}, sellerRole=${sellerRole}, userId=${userId}, totalIdr=${o.totalIdr}`);
      
      // Add revenue if:
      // 1. Order is transitioning from non-completed to completed (normal case)
      // 2. OR order is already completed but revenueAdded flag is not set (recovery case)
      const shouldAddRevenue = !wasCompleted || (wasCompleted && !o.revenueAdded);
      
      if (shouldAddRevenue && sellerRole && userId && o.totalIdr > 0) {
        console.log(`💵 Adding revenue: sellerRole=${sellerRole}, userId=${userId}, totalIdr=${o.totalIdr}, sellerId=${sellerId}`);
        addRevenueForUser(sellerRole, userId, o.totalIdr);
        revenueAdded = true;
        // Mark that revenue was added for this order
        updated.revenueAdded = true;
        console.log(`✅ Revenue added successfully!`);
      } else if (!shouldAddRevenue) {
        console.log(`ℹ️ Revenue already processed for this order. Skipping.`);
      } else {
        console.warn(`❌ Cannot add revenue: sellerRole=${sellerRole}, userId=${userId}, totalIdr=${o.totalIdr}, sellerId=${sellerId}`);
      }
    }
    return updated;
  });
  
  if (!orderFound) {
    console.warn(`Order ${orderId} not found in orders for ${cpId}`);
    return; // Don't save if order not found
  }
  
  // Update statusUpdatedAt and revenueAdded when status changes
  const updatedNext = next.map(o => {
    if (o.id === orderId) {
      const changes: Partial<Order> = {};
      if (o.status !== status) {
        changes.statusUpdatedAt = new Date().toISOString();
      }
      // If revenue was added, mark it in the order
      if (revenueAdded) {
        changes.revenueAdded = true;
      }
      return { ...o, ...changes };
    }
    return o;
  });
  
  saveCpOrders(cpId, updatedNext);
  
  // Update revenueAdded flag in Supabase if revenue was added
  if (revenueAdded && isSupabaseConfigured()) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      if (isUUID) {
        await supabase
          .from('orders')
          .update({ revenue_added: true })
          .eq('id', orderId);
      }
    } catch (error) {
      console.error('Error updating revenue_added flag in Supabase:', error);
    }
  }
  
  if (revenueAdded) {
    // Trigger a custom event to notify UI of revenue update
    try {
      window.dispatchEvent(new CustomEvent('smartcow_revenue_updated', { detail: { cpId } } as any));
    } catch {}
  }
}

// Auto-update order status based on time elapsed
export async function autoUpdateOrderStatuses() {
  const allOrders: Order[] = [];
  
  // Get all orders from all sellers/processors
  try {
    // Get all keys from localStorage that match order pattern
    const keys = Object.keys(localStorage);
    const orderKeys = keys.filter(key => key.startsWith(CP_ORDERS_PREFIX));
    
    for (const key of orderKeys) {
      const orders = safeRead<Order[]>(key, []);
      allOrders.push(...orders);
    }
  } catch (error) {
    console.error('Error fetching orders for auto-update:', error);
    return;
  }
  
  const now = new Date().getTime();
  const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
  let updated = false;
  
  for (const order of allOrders) {
    if (!order.statusUpdatedAt) {
      // If no statusUpdatedAt, use createdAt
      order.statusUpdatedAt = order.createdAt;
    }
    
    const statusUpdatedTime = new Date(order.statusUpdatedAt).getTime();
    const timeElapsed = now - statusUpdatedTime;
    
    let newStatus: Order['status'] | null = null;
    
    if (order.status === 'packaging' && timeElapsed >= FIVE_MINUTES) {
      newStatus = 'shipping';
    } else if (order.status === 'shipping' && timeElapsed >= FIVE_MINUTES) {
      newStatus = 'delivered';
    }
    
    if (newStatus) {
      // Update order status
      const cpId = order.sellerId;
      await updateOrderStatus(cpId, order.id, newStatus);
      updated = true;
      console.log(`🔄 Auto-updated order ${order.id} from ${order.status} to ${newStatus}`);
    }
  }
  
  if (updated) {
    // Trigger event to refresh UI
    try {
      window.dispatchEvent(new CustomEvent('smartcow_orders_updated'));
    } catch {}
  }
}

export function addRevenueForUser(role: 'seller' | 'compostProcessor', userId: string, amount: number) {
  try {
    if (!role || !userId || amount <= 0) {
      console.warn(`Invalid revenue parameters: role=${role}, userId=${userId}, amount=${amount}`);
      return;
    }
    const key = `${REVENUE_PREFIX}${role}:${userId}`;
    const current = safeRead<number>(key, 0);
    const newTotal = current + amount;
    safeWrite(key, newTotal);
    console.log(`💰 Revenue added: ${amount} for ${role}:${userId}. New total: ${newTotal}. Key: ${key}`);
  } catch (error) {
    console.error('Error adding revenue:', error);
  }
}

export function getRevenueForUser(role: 'seller' | 'compostProcessor', userId: string) {
  try {
    const key = `${REVENUE_PREFIX}${role}:${userId}`;
    const revenue = safeRead<number>(key, 0);
    console.log(`📊 Getting revenue for ${role}:${userId}. Key: ${key}, Revenue: ${revenue}`);
    return revenue;
  } catch { return 0; }
}

type ChatMessage = { id: string; conversationId: string; fromId: string; fromName: string; fromRole: string; toId: string; toName: string; toRole: string; text: string; timestamp: string };

function makeConversationId(a: string, b: string) { return [a, b].sort().join('|'); }

export function sendMessage(from: { id: string; name: string; role: UserRole }, to: { id: string; name: string; role: UserRole }, text: string) {
  const convId = makeConversationId(from.id, to.id);
  const msg: ChatMessage = { id: `m-${Date.now()}`, conversationId: convId, fromId: from.id, fromName: from.name, fromRole: String(from.role || ''), toId: to.id, toName: to.name, toRole: String(to.role || ''), text, timestamp: new Date().toISOString() };
  const list = safeRead<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
  safeWrite(CHAT_MESSAGES_KEY, [...list, msg]);
}

export function sendSystemMessage(toId: string, fromId: string, text: string) {
  const from = { id: fromId, name: 'System', role: 'admin' as UserRole };
  const to = { id: toId, name: '', role: null as UserRole };
  sendMessage(from, to, text);
}

export async function getOverview(cpId: string): Promise<Overview> {
  const products = await getCpProducts(cpId);
  const orders = await getCpOrders(cpId);
  const articles = getCpArticles(cpId);
  const msgs = safeRead<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
  const inquiries = msgs.filter(m => m.toId === cpId).length;
  // compute totalRevenue from revenue store (persistent per-role per-user)
  // cpId is like 'seller:username' or 'compost_processor:username'
  const [rolePart, ...rest] = cpId.split(':');
  const role = rolePart === 'seller' ? 'seller' : rolePart === 'compost_processor' ? 'compostProcessor' : undefined;
  const userId = rest.join(':') || cpId;
  console.log(`🔍 getOverview for cpId: ${cpId}, role: ${role}, userId: ${userId}`);
  let totalSalesIdr = 0;
  if (role) {
    totalSalesIdr = getRevenueForUser(role, userId);
    console.log(`💰 Revenue from getRevenueForUser: ${totalSalesIdr}`);
    
    // If revenue is 0 or missing, OR if revenue is less than sum of completed orders,
    // calculate from completed orders and sync it (handles cases where revenue wasn't added)
    const calculatedRevenue = orders.filter(o => o.status === 'completed' || o.status === 'delivered').reduce((t, o) => t + o.totalIdr, 0);
    if (totalSalesIdr === 0 || totalSalesIdr < calculatedRevenue) {
      console.log(`💰 Revenue mismatch detected. Current: ${totalSalesIdr}, Calculated from completed orders: ${calculatedRevenue}`);
      if (calculatedRevenue > 0) {
        // Sync the calculated revenue to localStorage
        const key = `${REVENUE_PREFIX}${role}:${userId}`;
        safeWrite(key, calculatedRevenue);
        console.log(`💰 Synced revenue to localStorage: ${calculatedRevenue}`);
        totalSalesIdr = calculatedRevenue;
      }
    }
  } else {
    // Fallback: calculate from completed orders
    totalSalesIdr = orders.filter(o => o.status === 'completed').reduce((t, o) => t + o.totalIdr, 0);
    console.log(`💰 Revenue from completed orders: ${totalSalesIdr}`);
  }
  console.log(`💰 Total revenue calculated: ${totalSalesIdr}`);
  return { totalProducts: products.length, totalSalesIdr, educationalPosts: articles.length, inquiries };
}

// Liked Products Functions
export function getLikedProducts(userId: string): string[] {
  const key = `${LIKED_PRODUCTS_PREFIX}${userId}`;
  return safeRead<string[]>(key, []);
}

export function addLikedProduct(userId: string, productId: string) {
  const key = `${LIKED_PRODUCTS_PREFIX}${userId}`;
  const current = getLikedProducts(userId);
  if (!current.includes(productId)) {
    safeWrite(key, [...current, productId]);
    try {
      window.dispatchEvent(new CustomEvent('smartcow_liked_products_updated', { detail: { userId } } as any));
    } catch {}
  }
}

export function removeLikedProduct(userId: string, productId: string) {
  const key = `${LIKED_PRODUCTS_PREFIX}${userId}`;
  const current = getLikedProducts(userId);
  const updated = current.filter(id => id !== productId);
  safeWrite(key, updated);
  try {
    window.dispatchEvent(new CustomEvent('smartcow_liked_products_updated', { detail: { userId } } as any));
  } catch {}
}

export function isProductLiked(userId: string, productId: string): boolean {
  const liked = getLikedProducts(userId);
  return liked.includes(productId);
}
