import { UserRole } from '../App';

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
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
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
export function getCpProducts(cpId: string): Product[] {
  // Read from local storage (per-seller/compost-processor storage)
  // This is the source of truth for each seller's product list
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

export function createCpProduct(cpId: string, cpName: string, data: Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'createdAt'>): Product {
  // Only Seller and Compost Processor roles are allowed to create products
  if (!cpId.startsWith('seller:') && !cpId.startsWith('compost_processor:')) {
    throw new Error('Only Seller or Compost Processor can create products');
  }
  
  // Read current products from local storage (per-seller/compost-processor storage)
  const list = getCpProducts(cpId);
  
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
  
  // Add to local list and save (this will also update the global marketplace)
  const next = [item, ...list];
  saveCpProducts(cpId, next);
  
  return item;
}

export function updateCpProduct(cpId: string, id: string, patch: Partial<Product>) {
  const list = getCpProducts(cpId);
  const next = list.map(p => p.id === id ? { ...p, ...patch } : p);
  saveCpProducts(cpId, next);
  // saveCpProducts already dispatches events, but we'll ensure it's done here too
}

export function deleteCpProduct(cpId: string, id: string) {
  const list = getCpProducts(cpId);
  const next = list.filter(p => p.id !== id);
  saveCpProducts(cpId, next);
}

export function getMarketplaceProducts(): Product[] {
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

export function submitArticleForApproval(cpId: string, id: string) {
  const list = getCpArticles(cpId);
  const a = list.find(x => x.id === id);
  if (!a) return;
  a.status = 'pending';
  saveCpArticles(cpId, list);
  const pending = safeRead<any[]>(PENDING_ARTICLES_KEY, []);
  // Check if article already exists in pending (to avoid duplicates)
  const existingIndex = pending.findIndex(p => p.id === a.id);
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

export function getCpOrders(cpId: string): Order[] {
  return safeRead<Order[]>(`${CP_ORDERS_PREFIX}${cpId}`, []);
}

// Get all orders for a buyer by searching through all seller/processor orders
export function getBuyerOrders(buyerId: string): Order[] {
  const allOrders: Order[] = [];
  // Search through all localStorage keys that match the orders pattern
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

export function createOrderForSeller(item: { productId: string; productName: string; sellerId: string; sellerName: string; buyerId: string; buyerName: string; quantity: number; totalIdr: number; }) {
  // infer sellerRole from sellerId prefix
  const sellerRole = item.sellerId && item.sellerId.startsWith('seller:') ? 'seller' : item.sellerId && item.sellerId.startsWith('compost_processor:') ? 'compostProcessor' : undefined;
  const order: Order = { id: `ord-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, productId: item.productId, productName: item.productName, sellerId: item.sellerId, sellerRole, sellerName: item.sellerName, buyerId: item.buyerId, buyerName: item.buyerName, quantity: item.quantity, totalIdr: item.totalIdr, status: 'pending', createdAt: new Date().toISOString() };
  const list = getCpOrders(item.sellerId);
  const next = [order, ...list];
  saveCpOrders(item.sellerId, next);
  sendSystemMessage(item.sellerId, item.buyerId, `New order: ${order.productName} × ${order.quantity}`);
}

export function updateOrderStatus(cpId: string, orderId: string, status: Order['status']) {
  const list = getCpOrders(cpId);
  let orderFound = false;
  let revenueAdded = false;
  
  const next = list.map(o => {
    if (o.id !== orderId) return o;
    orderFound = true;
    
    // if transitioning to completed from a non-completed state, add revenue
    const wasCompleted = o.status === 'completed';
    const updated = { ...o, status } as Order;
    
    if (!wasCompleted && status === 'completed') {
      // Ensure this order belongs to the cpId (seller/processor) making the update
      // This prevents revenue from going to the wrong account
      if (o.sellerId !== cpId) {
        console.warn(`Order ${orderId} sellerId (${o.sellerId}) does not match cpId (${cpId})`);
        return updated; // Don't add revenue if order doesn't belong to this seller/processor
      }
      
      // determine role and userId from the order's sellerId
      const sellerId = o.sellerId;
      const sellerRole = o.sellerRole || (sellerId && sellerId.startsWith('seller:') ? 'seller' : sellerId && sellerId.startsWith('compost_processor:') ? 'compostProcessor' : undefined);
      
      // Extract userId from sellerId (format: 'seller:username' or 'compost_processor:username')
      let userId: string | undefined;
      if (sellerId && sellerId.includes(':')) {
        userId = sellerId.split(':').slice(1).join(':');
      } else {
        userId = sellerId;
      }
      
      if (sellerRole && userId && o.totalIdr > 0) {
        addRevenueForUser(sellerRole, userId, o.totalIdr);
        revenueAdded = true;
      } else {
        console.warn(`Cannot add revenue: sellerRole=${sellerRole}, userId=${userId}, totalIdr=${o.totalIdr}, sellerId=${sellerId}`);
      }
    }
    return updated;
  });
  
  if (!orderFound) {
    console.warn(`Order ${orderId} not found in orders for ${cpId}`);
    return; // Don't save if order not found
  }
  
  saveCpOrders(cpId, next);
  
  if (revenueAdded) {
    // Trigger a custom event to notify UI of revenue update
    try {
      window.dispatchEvent(new CustomEvent('smartcow_revenue_updated', { detail: { cpId } } as any));
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
  } catch (error) {
    console.error('Error adding revenue:', error);
  }
}

export function getRevenueForUser(role: 'seller' | 'compostProcessor', userId: string) {
  try {
    const key = `${REVENUE_PREFIX}${role}:${userId}`;
    return safeRead<number>(key, 0);
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

export function getOverview(cpId: string): Overview {
  const products = getCpProducts(cpId);
  const orders = getCpOrders(cpId);
  const articles = getCpArticles(cpId);
  const msgs = safeRead<ChatMessage[]>(CHAT_MESSAGES_KEY, []);
  const inquiries = msgs.filter(m => m.toId === cpId).length;
  // compute totalRevenue from revenue store (persistent per-role per-user)
  // cpId is like 'seller:username' or 'compost_processor:username'
  const [rolePart, ...rest] = cpId.split(':');
  const role = rolePart === 'seller' ? 'seller' : rolePart === 'compost_processor' ? 'compostProcessor' : undefined;
  const userId = rest.join(':') || cpId;
  const totalSalesIdr = role ? getRevenueForUser(role, userId) : orders.filter(o => o.status === 'completed').reduce((t, o) => t + o.totalIdr, 0);
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
