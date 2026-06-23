# Frontend-Backend API Audit

## Summary
The frontend (`/student-store-ui`) currently has **NO fetch/axios calls implemented**. However, the code structure reveals what API calls need to be made and what data shapes are expected.

---

## Required API Calls (Not Yet Implemented)

### 1. Fetch All Products
**Location:** `App.jsx` (line 19: `const [products, setProducts] = useState([])`)

**Expected Implementation:**
```javascript
useEffect(() => {
  const fetchProducts = async () => {
    setIsFetching(true);
    try {
      const response = await axios.get("http://localhost:3001/products");
      setProducts(response.data.products);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };
  fetchProducts();
}, []);
```

**API Contract Match:**
- ✅ Route: `GET /products`
- ✅ Response shape: `{ "products": [...] }`
- ✅ Fields used by frontend: `id`, `name`, `price`, `image_url`, `category`, `description`

**Status:** **MATCHES** - Backend API contract matches frontend expectations

---

### 2. Fetch Single Product
**Location:** `ProductDetail.jsx` (line 11: `const [product, setProduct] = useState(null)`)

**Expected Implementation:**
```javascript
useEffect(() => {
  const fetchProduct = async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`http://localhost:3001/products/${productId}`);
      setProduct(response.data.product);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };
  
  if (productId) {
    fetchProduct();
  }
}, [productId]);
```

**API Contract Match:**
- ✅ Route: `GET /products/:id`
- ✅ Response shape: `{ "product": {...} }`
- ✅ Fields used: `id`, `name`, `price`, `image_url`, `description`

**Status:** **MATCHES** - Backend API contract matches frontend expectations

---

### 3. Create Order (Checkout)
**Location:** `App.jsx` (line 39: `const handleOnCheckout = async () => {}`)

**Expected Implementation:**
```javascript
const handleOnCheckout = async () => {
  setIsCheckingOut(true);
  setError(null);
  
  try {
    // Transform cart object to items array
    const items = Object.keys(cart).map(productId => ({
      product_id: parseInt(productId),
      quantity: cart[productId]
    }));
    
    const orderData = {
      customer_id: 1, // Could use userInfo to generate this
      status: "pending",
      items: items
    };
    
    const response = await axios.post("http://localhost:3001/orders", orderData);
    setOrder(response.data.order);
    setCart({}); // Clear cart after successful order
  } catch (err) {
    setError(err.message);
  } finally {
    setIsCheckingOut(false);
  }
};
```

**API Contract Match:**
- ✅ Route: `POST /orders`
- ✅ Request body shape matches planning.md
- ✅ Response shape: `{ "order": {...} }`

**Status:** **MATCHES** - Backend API contract matches frontend expectations

---

## Frontend Data Structures Analysis

### Product Object (Expected by Frontend)
Based on usage in `ProductDetail.jsx`, `CartTable`, and `ProductCard`:

```javascript
{
  id: Number,           // ✅ Matches backend (Product.id)
  name: String,         // ✅ Matches backend (Product.name)
  price: Number,        // ✅ Matches backend (Product.price as Float)
  image_url: String,    // ✅ Matches backend (Product.image_url)
  category: String,     // ✅ Matches backend (Product.category)
  description: String   // ✅ Matches backend (Product.description)
}
```

**Status:** **PERFECT MATCH** - All fields align exactly

---

### Cart Structure (Frontend)
The cart is stored as an object with product IDs as keys:

```javascript
{
  "1": 2,    // productId: quantity
  "5": 1,
  "8": 3
}
```

**Transformation needed for POST /orders:**
Frontend cart → Backend items array:
```javascript
// Frontend cart
{ "1": 2, "5": 1 }

// Needs to become
[
  { product_id: 1, quantity: 2 },
  { product_id: 5, quantity: 1 }
]
```

**Status:** Simple transformation required (see implementation above)

---

### Order Object (Expected by Frontend)
Based on `App.jsx` line 24: `const [order, setOrder] = useState(null)`

Frontend expects after checkout:
```javascript
{
  order_id: Number,
  customer_id: Number,
  total_price: Number,
  status: String,
  created_at: String,
  items: [
    {
      order_item_id: Number,
      order_id: Number,
      product_id: Number,
      quantity: Number,
      price: Number
    }
  ]
}
```

**API Contract Match:**
- ✅ All fields match backend response from `POST /orders`
- ✅ Includes nested `items` array as expected

**Status:** **MATCHES** - Backend response structure matches frontend expectations

---

### User Info Structure (Frontend)
Based on `App.jsx` line 18:

```javascript
{
  name: String,
  dorm_number: String
}
```

**Backend Mapping:**
- Frontend doesn't have `customer_id` in userInfo
- Backend `Order.customer_id` is an integer
- **Recommendation:** Either:
  1. Generate a temporary `customer_id` from `dorm_number` (e.g., parseInt(dorm_number))
  2. Add `customer_id` to userInfo state
  3. Use a hardcoded customer_id (e.g., 1) for this student project

**Status:** **MINOR MISMATCH** - Needs customer_id mapping strategy

---

## Field Name Comparison

### Product Fields
| Frontend Usage | Backend Schema | Match |
|----------------|----------------|-------|
| `id` | `id` | ✅ |
| `name` | `name` | ✅ |
| `price` | `price` | ✅ |
| `image_url` | `image_url` | ✅ |
| `category` | `category` | ✅ |
| `description` | `description` | ✅ |

### Order Fields
| Frontend Usage | Backend Schema | Match |
|----------------|----------------|-------|
| `order_id` | `order_id` | ✅ |
| `customer_id` | `customer_id` | ✅ |
| `total_price` | `total_price` | ✅ |
| `status` | `status` | ✅ |
| `created_at` | `created_at` | ✅ |
| `items` | `items` | ✅ |

### OrderItem Fields
| Frontend Usage | Backend Schema | Match |
|----------------|----------------|-------|
| `order_item_id` | `order_item_id` | ✅ |
| `order_id` | `order_id` | ✅ |
| `product_id` | `product_id` | ✅ |
| `quantity` | `quantity` | ✅ |
| `price` | `price` | ✅ |

---

## Issues & Resolutions

### Issue 1: No API Base URL Configuration
**Problem:** Frontend doesn't have a centralized API base URL
**Resolution:** Create a constants file:

```javascript
// src/constants.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
```

**Status:** Needs implementation

---

### Issue 2: customer_id Missing from Frontend State
**Problem:** Frontend has `userInfo.name` and `userInfo.dorm_number` but no `customer_id`
**Resolution:** Use `dorm_number` to derive customer_id:

```javascript
const customer_id = parseInt(userInfo.dorm_number) || 1;
```

**Status:** Needs implementation decision

---

### Issue 3: CORS Configuration
**Problem:** Backend API likely needs CORS enabled for frontend (different ports)
**Resolution:** Add CORS middleware to backend:

```javascript
// In server.js
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173' // Vite default port
}));
```