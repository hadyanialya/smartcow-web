# Debugging Guide: Compost Processor Products Not Appearing in Marketplace

## Issue Summary
Compost Processor products are not appearing in the marketplace after creation, even though they exist in the dashboard with `status: 'active'`.

## Root Causes Identified & Fixed

### 1. **Product Enrichment Logic** ✅ FIXED
- **Issue**: The `enrich` function had a complex status check that could fail silently
- **Fix**: Simplified status checking with explicit string comparison and better error handling
- **Location**: `src/components/Marketplace.tsx` - `enrich()` function

### 2. **Filtering Logic** ✅ FIXED
- **Issue**: The `statusAllowed` check was too strict for non-owner views
- **Fix**: Improved filtering logic with better owner/non-owner distinction
- **Location**: `src/components/Marketplace.tsx` - `filteredProducts` useMemo

### 3. **Refresh Logic** ✅ ENHANCED
- **Issue**: Silent failures in product refresh
- **Fix**: Added comprehensive error handling and console logging for debugging
- **Location**: `src/components/Marketplace.tsx` - `refreshProducts()` function

## Step-by-Step Debugging Process

### Step 1: Verify Product Creation
1. Open browser DevTools (F12)
2. Go to Console tab
3. Login as Compost Processor
4. Create a new product with:
   - Name: "Test Product"
   - Status: "active"
   - Stock: > 0 (e.g., 10)
   - All required fields filled
5. Click "Save"

### Step 2: Check Local Storage
In browser console, run:

```javascript
// Check if product is saved locally
const cpId = 'compost_processor:YOUR_USERNAME'; // Replace with your username
const localKey = `smartcow_cp_products:${cpId}`;
const localProducts = JSON.parse(localStorage.getItem(localKey) || '[]');
console.log('Local Products:', localProducts);
console.log('Product Status:', localProducts[0]?.status);
console.log('Product sellerId:', localProducts[0]?.sellerId);
```

**Expected**: Should see your product with:
- `status: "active"` (exact string, lowercase)
- `sellerId: "compost_processor:YOUR_USERNAME"` (exact format)

### Step 3: Check Global Marketplace
In browser console, run:

```javascript
// Check global marketplace
const marketplace = JSON.parse(localStorage.getItem('smartcow_marketplace_products') || '[]');
console.log('Marketplace Products:', marketplace);
console.log('Marketplace Count:', marketplace.length);

// Filter for Compost Processor products
const cpProducts = marketplace.filter(p => p.sellerId?.includes('compost_processor'));
console.log('CP Products in Marketplace:', cpProducts);
console.log('CP Product Status:', cpProducts[0]?.status);
console.log('CP Product Stock:', cpProducts[0]?.stock);
```

**Expected**: Should see your product in the marketplace array with:
- `status: "active"`
- `stock: > 0` (if you want it to show as "in stock")
- `sellerId: "compost_processor:YOUR_USERNAME"`

### Step 4: Check Console Logs
After navigating to Marketplace, check console for:
- `[Marketplace] Raw products from storage:` - Should show products array
- `[Marketplace] Enriched products:` - Should show enriched products
- `[Marketplace] Valid products after filtering:` - Should show count > 0

### Step 5: Verify Product Structure
In console, run:

```javascript
const marketplace = JSON.parse(localStorage.getItem('smartcow_marketplace_products') || '[]');
const yourProduct = marketplace.find(p => p.name === 'YOUR_PRODUCT_NAME');
console.log('Your Product:', yourProduct);
console.log('Has required fields:', {
  id: !!yourProduct?.id,
  name: !!yourProduct?.name,
  sellerId: !!yourProduct?.sellerId,
  status: yourProduct?.status,
  stock: yourProduct?.stock,
  price: yourProduct?.price,
  category: yourProduct?.category
});
```

## Common Issues & Solutions

### Issue 1: Product has `stock: 0`
**Symptom**: Product exists but doesn't show in marketplace for non-owners
**Solution**: Set stock > 0 when creating product
**Reason**: Non-owners only see products with `inStock: true`, which requires `stock > 0`

### Issue 2: Product has `status: "inactive"`
**Symptom**: Product doesn't appear in marketplace at all
**Solution**: Ensure status is exactly `"active"` (lowercase, no spaces)
**Reason**: Only active products are added to global marketplace

### Issue 3: `sellerId` format mismatch
**Symptom**: Product appears in local storage but not in marketplace
**Solution**: Verify `sellerId` format is exactly `"compost_processor:username"` (no typos)
**Check**: Run `console.log(localProducts[0]?.sellerId)` and verify format

### Issue 4: Category mismatch
**Symptom**: Product exists but filtered out by category
**Solution**: Check if selected category filter matches product category
**Check**: Try setting category filter to "all"

### Issue 5: Price range filter
**Symptom**: Product filtered out by price
**Solution**: Check if product price is within the selected price range
**Check**: Try resetting price range filter

## Verification Checklist

After creating a Compost Processor product, verify:

- [ ] Product appears in "My Products" tab (Compost Processor Dashboard)
- [ ] Product has `status: "active"` in local storage
- [ ] Product has `stock: > 0` (if you want it purchasable)
- [ ] Product appears in `smartcow_marketplace_products` in localStorage
- [ ] Product has correct `sellerId` format: `"compost_processor:username"`
- [ ] Console shows products being loaded: `[Marketplace] Raw products from storage:`
- [ ] Product appears in Marketplace when viewing as:
  - [ ] Compost Processor (My Catalog view)
  - [ ] Other user (Marketplace view) - only if `stock > 0`
- [ ] No console errors related to product enrichment

## Testing Different Scenarios

### Scenario 1: Viewing as Compost Processor (Owner)
- Should see product in "My Catalog"
- Product should appear even if `stock: 0`
- Product should appear even if `status: "inactive"` (in My Catalog only)

### Scenario 2: Viewing as Other User (Non-Owner)
- Should see product in Marketplace
- Product must have `status: "active"` AND `stock > 0`
- Product will show as "Out of Stock" if `stock: 0`

### Scenario 3: Product with `stock: 0`
- Appears in "My Catalog" for owner
- Does NOT appear in Marketplace for non-owners
- Shows as "Out of Stock" badge if visible

## Quick Fix Commands

If product is not in marketplace, manually add it:

```javascript
// Get your product from local storage
const cpId = 'compost_processor:YOUR_USERNAME';
const localKey = `smartcow_cp_products:${cpId}`;
const localProducts = JSON.parse(localStorage.getItem(localKey) || '[]');
const yourProduct = localProducts[0]; // Get first product

// Get current marketplace
const marketplace = JSON.parse(localStorage.getItem('smartcow_marketplace_products') || '[]');

// Remove old version if exists
const filtered = marketplace.filter(p => p.sellerId !== cpId);

// Add active products
const activeProducts = localProducts.filter(p => p.status === 'active');
const updated = [...filtered, ...activeProducts];

// Save
localStorage.setItem('smartcow_marketplace_products', JSON.stringify(updated));

// Refresh page
location.reload();
```

## Next Steps

1. Follow the debugging steps above
2. Check console logs for any errors
3. Verify product structure matches expected format
4. Test with different stock values (0 vs > 0)
5. Test viewing as different user roles

If issue persists after following these steps, check:
- Browser console for errors
- Network tab for any failed requests
- Application tab in DevTools for localStorage values

