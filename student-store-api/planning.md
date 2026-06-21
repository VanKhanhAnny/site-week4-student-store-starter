# Student Store API - Planning Document

## Section 1: Data Models

### Product Model

**Fields:**
- `id` - Int - Primary Key - Auto-incrementing - Required
- `name` - String - Required
- `description` - String - Required
- `price` - Float - Required
- `image_url` - String - Required
- `category` - String - Required

**Primary Key:**
- Field: `id`
- Auto-increment: Yes

**Relationships:**
- One-to-many relationship with OrderItem (one product can appear in many order items)
- Foreign key reference: OrderItem.product_id → Product.id

**Cascade Behavior:**
When a Product is deleted:
- All OrderItem records referencing this product (via product_id) must be deleted
- Cascade delete: `onDelete: Cascade` on OrderItem.product relation
- **Reasoning:** If a product no longer exists, the order items referencing it become meaningless. The order item is a join record that depends on both the product and order existing. Without the product data, the order item cannot represent a valid purchase.

---

### Order Model

**Fields:**
- `order_id` - Int - Primary Key - Auto-incrementing - Required
- `customer_id` - Int - Required
- `total_price` - Float - Required
- `status` - String - Required
- `created_at` - DateTime - Required - Default: `now()`

**Primary Key:**
- Field: `order_id`
- Auto-increment: Yes

**Relationships:**
- One-to-many relationship with OrderItem (one order can contain many order items)
- Foreign key reference: OrderItem.order_id → Order.order_id

**Cascade Behavior:**
When an Order is deleted:
- All OrderItem records referencing this order (via order_id) must be deleted
- Cascade delete: `onDelete: Cascade` on OrderItem.order relation
- **Reasoning:** Order items are child records that cannot exist without their parent order. If an order is cancelled or deleted, all its line items should be removed as they have no meaning without the order context.

---

### OrderItem Model (Junction Table)

**Fields:**
- `order_item_id` - Int - Primary Key - Auto-incrementing - Required
- `order_id` - Int - Foreign Key - Required
- `product_id` - Int - Foreign Key - Required
- `quantity` - Int - Required
- `price` - Float - Required (price at time of order, may differ from current product price)

**Primary Key:**
- Field: `order_item_id`
- Auto-increment: Yes

**Relationships:**
- Many-to-one relationship with Order (many order items belong to one order)
  - Foreign key: `order_id` references Order.order_id
  - Cascade rule: `onDelete: Cascade`
  
- Many-to-one relationship with Product (many order items reference one product)
  - Foreign key: `product_id` references Product.id
  - Cascade rule: `onDelete: Cascade`

**Price Snapshot Pattern:**
OrderItem stores its own `price` field instead of referencing Product.price. This is intentional:
- **At order creation time:** The price is fetched from the Product table during validation and copied into OrderItem
- **After order creation:** The OrderItem.price remains frozen, even if Product.price changes

**Cascade Behavior:**
OrderItem sits at the intersection of two cascade delete rules:
1. If the parent Order is deleted → this OrderItem is deleted
2. If the referenced Product is deleted → this OrderItem is deleted

**Cascade Conflict Scenario:**
If a Product is deleted while it appears in an active Order:
- The OrderItem records linking that product to any orders will be deleted (due to Product cascade)
- The Order itself remains intact but loses those line items
- The Order's total_price becomes stale (doesn't include deleted items)
- **Design Decision:** We accept this behavior because:
  - Products being deleted mid-order is an edge case that should be handled by business logic
  - Keeping orphaned order items would break referential integrity
  - Orders maintain a snapshot of the purchase event even if line items are removed
  - Alternative would be to prevent product deletion if referenced in orders, but that adds complexity
- **Note:** Even though the OrderItem is deleted, it had captured the price at order time, so there's a historical record before deletion

---

## Section 2: API Contract

### Global Error Response Format
All error responses follow this shape:
```json
{
  "error": "Human-readable error message"
}
```

---

### Product Endpoints

#### GET /products
**Request:**
- Method: GET
- Path: `/products`
- Body: None

**Query Parameters:**
All query parameters are optional. If no parameters are provided, all products are returned in unsorted order.

- `category` (string, optional) — Filter products by category (case-insensitive, exact match)
  - Example: `?category=electronics`
  - Returns only products where `category` matches the provided value
  - If the category doesn't exist, returns an empty array (not an error)

- `sort` (string, optional) — Sort products by a specific field
  - Allowed values: `price`, `name`, `id`, `category`
  - Default order: ascending (lowest to highest for numbers, A-Z for strings)
  - Example: `?sort=price` returns products from cheapest to most expensive
  - Example: `?sort=name` returns products alphabetically by name
  - Invalid sort values are ignored (returns unsorted results)

- `order` (string, optional) — Sort direction (only applies when `sort` is provided)
  - Allowed values: `asc` (ascending, default), `desc` (descending)
  - Example: `?sort=price&order=desc` returns products from most expensive to cheapest
  - If `order` is provided without `sort`, it is ignored

**Combined Examples:**
- `GET /products` — all products, unsorted
- `GET /products?category=Electronics` — only Electronics products, unsorted
- `GET /products?sort=price` — all products, sorted by price ascending
- `GET /products?sort=price&order=desc` — all products, sorted by price descending
- `GET /products?category=Clothing&sort=name` — only Clothing products, sorted alphabetically
- `GET /products?category=Electronics&sort=price&order=desc` — only Electronics, most expensive first

**Default Behavior:**
- No `category`: Returns all products regardless of category
- No `sort`: Returns products in database insertion order (by ID)
- No `order`: Uses ascending order when sorting

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "products": [
    {
      "id": 1,
      "name": "Laptop",
      "description": "High-performance laptop",
      "price": 999.99,
      "image_url": "https://example.com/laptop.jpg",
      "category": "Electronics"
    }
  ]
}
```

**Error Response:**
- Status: 500 Internal Server Error
- Body: `{ "error": "Failed to fetch products" }`

---

#### GET /products/:id
**Request:**
- Method: GET
- Path: `/products/:id`
- Route params: `id` (integer)
- Body: None

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "product": {
    "id": 1,
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "image_url": "https://example.com/laptop.jpg",
    "category": "Electronics"
  }
}
```

**Error Responses:**
- Status: 404 Not Found
- Body: `{ "error": "Product not found" }`

- Status: 400 Bad Request
- Body: `{ "error": "Invalid product ID" }`

---

#### POST /products
**Request:**
- Method: POST
- Path: `/products`
- Body:
```json
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "image_url": "https://example.com/laptop.jpg",
  "category": "Electronics"
}
```

**Success Response:**
- Status: 201 Created
- Body:
```json
{
  "product": {
    "id": 1,
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "image_url": "https://example.com/laptop.jpg",
    "category": "Electronics"
  }
}
```

**Error Responses:**
- Status: 400 Bad Request
- Body: `{ "error": "Missing required fields: name, description, price, image_url, category" }`

- Status: 400 Bad Request
- Body: `{ "error": "Invalid price: must be a positive number" }`

---

#### PUT /products/:id
**Request:**
- Method: PUT
- Path: `/products/:id`
- Route params: `id` (integer)
- Body (all fields optional):
```json
{
  "name": "Updated Laptop",
  "description": "New description",
  "price": 899.99,
  "image_url": "https://example.com/new-laptop.jpg",
  "category": "Electronics"
}
```

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "product": {
    "id": 1,
    "name": "Updated Laptop",
    "description": "New description",
    "price": 899.99,
    "image_url": "https://example.com/new-laptop.jpg",
    "category": "Electronics"
  }
}
```

**Error Responses:**
- Status: 404 Not Found
- Body: `{ "error": "Product not found" }`

- Status: 400 Bad Request
- Body: `{ "error": "No valid fields provided for update" }`

---

#### DELETE /products/:id
**Request:**
- Method: DELETE
- Path: `/products/:id`
- Route params: `id` (integer)
- Body: None

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "message": "Product deleted successfully"
}
```

**Error Responses:**
- Status: 404 Not Found
- Body: `{ "error": "Product not found" }`

**Side Effects:**
- All OrderItem records referencing this product will be cascade deleted
- Orders containing this product will lose those line items (but orders themselves remain)

---

### Order Endpoints

#### GET /orders
**Request:**
- Method: GET
- Path: `/orders`
- Query params: None
- Body: None

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "orders": [
    {
      "order_id": 1,
      "customer_id": 123,
      "total_price": 1999.98,
      "status": "pending",
      "created_at": "2026-06-20T10:30:00Z"
    }
  ]
}
```

**Error Response:**
- Status: 500 Internal Server Error
- Body: `{ "error": "Failed to fetch orders" }`

---

#### GET /orders/:order_id
**Request:**
- Method: GET
- Path: `/orders/:order_id`
- Route params: `order_id` (integer)
- Body: None

**Success Response:**
- Status: 200 OK
- Body (includes order items with product details):
```json
{
  "order": {
    "order_id": 1,
    "customer_id": 123,
    "total_price": 1999.98,
    "status": "pending",
    "created_at": "2026-06-20T10:30:00Z",
    "items": [
      {
        "order_item_id": 1,
        "product_id": 5,
        "quantity": 2,
        "price": 999.99,
        "product": {
          "id": 5,
          "name": "Laptop",
          "description": "High-performance laptop",
          "image_url": "https://example.com/laptop.jpg",
          "category": "Electronics"
        }
      }
    ]
  }
}
```

**Error Responses:**
- Status: 404 Not Found
- Body: `{ "error": "Order not found" }`

- Status: 400 Bad Request
- Body: `{ "error": "Invalid order ID" }`

---

#### POST /orders
**Request:**
- Method: POST
- Path: `/orders`
- Body:
```json
{
  "customer_id": 123,
  "status": "pending",
  "items": [
    {
      "product_id": 5,
      "quantity": 2
    },
    {
      "product_id": 8,
      "quantity": 1
    }
  ]
}
```

**Success Response:**
- Status: 201 Created
- Body:
```json
{
  "order": {
    "order_id": 1,
    "customer_id": 123,
    "total_price": 2499.97,
    "status": "pending",
    "created_at": "2026-06-20T10:30:00Z",
    "items": [
      {
        "order_item_id": 1,
        "product_id": 5,
        "quantity": 2,
        "price": 999.99
      },
      {
        "order_item_id": 2,
        "product_id": 8,
        "quantity": 1,
        "price": 499.99
      }
    ]
  }
}
```

**Error Responses:**
- Status: 400 Bad Request
- Body: `{ "error": "Missing required fields: customer_id, status, items" }`

- Status: 400 Bad Request
- Body: `{ "error": "Items array cannot be empty" }`

- Status: 404 Not Found
- Body: `{ "error": "Product with ID 5 not found" }`

- Status: 400 Bad Request
- Body: `{ "error": "Invalid quantity for product 5: must be a positive integer" }`

- Status: 500 Internal Server Error
- Body: `{ "error": "Transaction failed: unable to create order" }`

---

#### PUT /orders/:order_id
**Request:**
- Method: PUT
- Path: `/orders/:order_id`
- Route params: `order_id` (integer)
- Body (all fields optional):
```json
{
  "status": "completed",
  "total_price": "2499.97"
}
```

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "order": {
    "order_id": 1,
    "customer_id": 123,
    "total_price": 2499.97,
    "status": "completed",
    "created_at": "2026-06-20T10:30:00Z"
  }
}
```

**Error Responses:**
- Status: 404 Not Found
- Body: `{ "error": "Order not found" }`

- Status: 400 Bad Request
- Body: `{ "error": "Invalid status value" }`

---

#### DELETE /orders/:order_id
**Request:**
- Method: DELETE
- Path: `/orders/:order_id`
- Route params: `order_id` (integer)
- Body: None

**Success Response:**
- Status: 200 OK
- Body:
```json
{
  "message": "Order deleted successfully"
}
```

**Error Responses:**
- Status: 404 Not Found
- Body: `{ "error": "Order not found" }`

**Side Effects:**
- All OrderItem records belonging to this order will be cascade deleted

---

## Section 3: Transactional Flow for POST /orders

### Overview
The POST /orders endpoint is the most complex operation in this API. It must atomically create an order with multiple order items, calculate the total price, and ensure data integrity. All operations must succeed or fail together — partial order creation is not acceptable.

### Request Structure
The client sends:
```json
{
  "customer_id": 123,
  "status": "pending",
  "items": [
    { "product_id": 5, "quantity": 2 },
    { "product_id": 8, "quantity": 1 }
  ]
}
```

**Key Points:**
- Order metadata: `customer_id`, `status`
- Items array: each item specifies `product_id` and `quantity` (not price)
- Price is fetched from the Product table at order creation time
- Total is calculated server-side, not trusted from client

### Step-by-Step Data Layer Operations

### Phase 1: Validation (Outside Transaction)

#### Step 1: Request Structure Validation
1. Check that `customer_id`, `status`, and `items` are present
2. Verify `items` is a non-empty array
3. Validate each item has `product_id` (integer) and `quantity` (positive integer)

If validation fails → return 400 Bad Request immediately, no database operations

#### Step 2: Batch Fetch All Products
Extract all product IDs from the request and fetch them in a single query:
```javascript
const productIds = items.map(item => parseInt(item.product_id))
const products = await prisma.product.findMany({
  where: { id: { in: productIds } }
})
```

**Why batch fetch?**
- One database query instead of N queries (more efficient)
- Faster for orders with multiple items
- Still validates all products exist before creating order

#### Step 3: Validate All Products Exist
Check if all requested products were found:
```javascript
if (products.length !== productIds.length) {
  const foundIds = products.map(p => p.id)
  const missingId = productIds.find(id => !foundIds.includes(id))
  throw new Error(`Product with ID ${missingId} not found`)
}
```

If any product is missing → return 404 Not Found immediately, no database operations

**Why validate before transaction?**
- Fail fast: clients get validation errors immediately
- Shorter transaction time: only writes happen in transaction
- Better performance: no rollback needed for validation errors

#### Step 4: Build Items with Prices
Create a map of products and attach prices to items:
```javascript
const productMap = Object.fromEntries(products.map(p => [p.id, p]))
const itemsWithPrices = items.map(item => ({
  product_id: parseInt(item.product_id),
  quantity: parseInt(item.quantity),
  price: productMap[parseInt(item.product_id)].price
}))
```

**Why fetch prices here?**
- Client doesn't send prices (security: prevent price tampering)
- We capture price at order time (historical accuracy: product prices may change later)
- Each order item stores the price it was purchased at

#### Step 5: Calculate Total Price
Calculate in memory before opening transaction:
```javascript
const total_price = itemsWithPrices
  .reduce((sum, item) => sum + (item.price * item.quantity), 0)
```

**Why calculate server-side?**
- Client cannot be trusted with financial calculations
- Prevents price manipulation attacks
- Ensures consistency with product prices fetched from database

---

### Phase 2: Transaction (Only Writes)

#### Step 6: Begin Transaction
All validation is complete. Now open transaction for writes only:
```javascript
const result = await prisma.$transaction(async (tx) => {
  // Only database writes happen here
})
```

**Why transaction is shorter:**
- No validation logic inside (already done)
- No conditional branches (data is clean)
- Minimal lock time on database
- Better concurrency for other requests

#### Step 7: Create Order Record (Inside Transaction)
```javascript
const order = await tx.order.create({
  data: {
    customer_id: parseInt(customer_id),
    status,
    total_price
  }
})
```

Capture the auto-generated `order.order_id` for next step.

#### Step 8: Create All Order Items (Inside Transaction)
Use `createMany` for batch insert:
```javascript
await tx.orderItem.createMany({
  data: itemsWithPrices.map(item => ({
    order_id: order.order_id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price
  }))
})
```

**Why createMany?**
- Single INSERT statement for all items (most efficient)
- Atomic operation: all items created or none
- Much faster than loop of individual creates

#### Step 9: Fetch Created Order with Items (Inside Transaction)
Before committing, fetch the complete order:
```javascript
return await tx.order.findUnique({
  where: { order_id: order.order_id },
  include: { items: true }
})
```

This is the response body we'll return to the client.

#### Step 10: Commit Transaction
If all operations succeed:
- Transaction commits automatically
- Database changes are persisted
- Return 201 Created with complete order

If any operation fails:
- Transaction rolls back automatically
- No database changes persist
- Return 500 Internal Server Error

### Error Scenarios and Flow Behavior

#### Scenario 1: Nonexistent Product
**Request:**
```json
{
  "customer_id": 123,
  "status": "pending",
  "items": [
    { "product_id": 999, "quantity": 2 }
  ]
}
```

**What happens:**
1. **Phase 1 (Validation):**
   - Step 1: Request structure validated ✓
   - Step 2: Batch fetch products → product_id=999 not found
   - Step 3: Check fails → `products.length (0) !== productIds.length (1)`
   - Return 404 Not Found immediately
2. **Phase 2 (Transaction):**
   - Never reached
3. **Database state:** Unchanged (no queries except read)
4. **Response:** 404 Not Found

**Key Point:** Transaction never opens. Validation catches the error before any writes.

#### Scenario 2: Mixed Valid/Invalid Products
**Request:**
```json
{
  "customer_id": 123,
  "status": "pending",
  "items": [
    { "product_id": 5, "quantity": 2 },
    { "product_id": 999, "quantity": 1 }
  ]
}
```

**What happens:**
1. **Phase 1 (Validation):**
   - Step 1: Request structure validated ✓
   - Step 2: Batch fetch `[5, 999]` → only product 5 found
   - Step 3: Check fails → `products.length (1) !== productIds.length (2)`
   - Find missing ID: 999
   - Return 404 Not Found immediately
2. **Phase 2 (Transaction):**
   - Never reached
3. **Database state:** Unchanged
4. **Response:** 404 Not Found with message "Product with ID 999 not found"

**Key Point:** Even though product 5 exists, nothing is created. Validation is all-or-nothing before transaction opens.

#### Scenario 3: Database Constraint Violation During Transaction
**Request:** (All validation passes, but database fails mid-transaction)

**What happens:**
1. **Phase 1 (Validation):**
   - All steps succeed ✓
   - Products exist, prices calculated, ready to write
2. **Phase 2 (Transaction):**
   - Step 6: Transaction begins
   - Step 7: Create order → success
   - Step 8: Create order items → database connection lost or constraint violation
   - Prisma throws error
   - Transaction rolls back automatically
3. **Database state:** Unchanged (rollback reverted the order creation)
4. **Response:** 500 Internal Server Error

**Key Point:** Even though validation passed, transactional integrity protects against partial writes during infrastructure failures.

#### Scenario 4: Product Deleted Between Validation and Transaction (Race Condition)
**Request:** (Valid, but product deleted after validation completes)

**What happens:**
1. **Phase 1 (Validation):**
   - Step 2: Fetch product_id=5 → exists ✓
   - Step 3-5: All validation succeeds ✓
2. **[Another request deletes product 5 here]**
3. **Phase 2 (Transaction):**
   - Step 7: Create order → success
   - Step 8: Create order items with product_id=5 → foreign key violation
   - Prisma throws error (P2003: foreign key constraint failed)
   - Transaction rolls back
4. **Database state:** Unchanged (rollback)
5. **Response:** 500 Internal Server Error

**Key Point:** This is an extremely rare edge case (millisecond window). For a simple project with no concurrent users, this won't happen. In production, we could catch P2003 and return a better error message.

### Response Success Case
If everything succeeds, return:
```json
{
  "order": {
    "order_id": 1,
    "customer_id": 123,
    "total_price": 2499.97,
    "status": "pending",
    "created_at": "2026-06-20T10:30:00Z",
    "items": [
      {
        "order_item_id": 1,
        "product_id": 5,
        "quantity": 2,
        "price": 999.99
      },
      {
        "order_item_id": 2,
        "product_id": 8,
        "quantity": 1,
        "price": 499.99
      }
    ]
  }
}
```

### Implementation Pattern (Validate-First Flow)
```javascript
app.post('/orders', async (req, res) => {
  try {
    const { customer_id, status, items } = req.body
    
    // ========== PHASE 1: VALIDATION (Outside Transaction) ==========
    
    // Step 1: Validate request structure
    if (!customer_id || !status || !items || items.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: customer_id, status, items"
      })
    }
    
    // Validate each item
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        return res.status(400).json({
          error: "Each item must have product_id and quantity"
        })
      }
      if (parseInt(item.quantity) <= 0) {
        return res.status(400).json({
          error: `Invalid quantity for product ${item.product_id}`
        })
      }
    }
    
    // Step 2: Batch fetch all products
    const productIds = items.map(item => parseInt(item.product_id))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })
    
    // Step 3: Validate all products exist
    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id)
      const missingId = productIds.find(id => !foundIds.includes(id))
      return res.status(404).json({
        error: `Product with ID ${missingId} not found`
      })
    }
    
    // Step 4: Build items with prices
    const productMap = Object.fromEntries(products.map(p => [p.id, p]))
    const itemsWithPrices = items.map(item => ({
      product_id: parseInt(item.product_id),
      quantity: parseInt(item.quantity),
      price: productMap[parseInt(item.product_id)].price
    }))
    
    // Step 5: Calculate total price
    const total_price = itemsWithPrices
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // ========== PHASE 2: TRANSACTION (Only Writes) ==========
    
    const result = await prisma.$transaction(async (tx) => {
      // Step 7: Create order
      const order = await tx.order.create({
        data: {
          customer_id: parseInt(customer_id),
          status,
          total_price
        }
      })
      
      // Step 8: Create all order items (batch)
      await tx.orderItem.createMany({
        data: itemsWithPrices.map(item => ({
          order_id: order.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }))
      })
      
      // Step 9: Fetch complete order with items
      return await tx.order.findUnique({
        where: { order_id: order.order_id },
        include: { items: true }
      })
    })
    
    res.status(201).json({ order: result })
    
  } catch (error) {
    res.status(500).json({ error: "Transaction failed: unable to create order" })
  }
})
```

### Why This Validate-First Approach Matters

**Benefits:**
1. **Atomicity:** Order and all its items are created together or not at all (transaction guarantees)
2. **Consistency:** Total price always matches the sum of order items (calculated before transaction)
3. **Performance:** Shorter transaction time means better concurrency and less database lock contention
4. **Fail Fast:** Invalid requests are rejected immediately without touching the database
5. **Clear Errors:** Validation errors return specific 400/404 responses instead of generic 500s
6. **Simpler Transaction:** Transaction code has no conditional logic, only writes

**What We Prevent:**
- Orders with no items (validation catches empty arrays)
- Orders with only some items (batch validation is all-or-nothing)
- Orders with nonexistent products (validation catches before transaction opens)
- Incorrect total prices (calculated from actual product prices, not client input)
- Database corruption from partial writes (transaction rollback protection)

**The Two-Phase Pattern:**
```
Phase 1 (Validation): Read + Validate + Calculate
  ↓ (fail fast on any error)
Phase 2 (Transaction): Write + Write + Commit
```

This separation makes POST /orders both correct (transactional) and efficient (short locks).

---

## Decisions Log — Product Model

### Schema Translation
**What went smoothly:**
- `price` as Float — Prisma's Float type maps cleanly to PostgreSQL's DOUBLE PRECISION, which is suitable for product prices in this project
- Auto-increment on `id` — Prisma's `@id @default(autoincrement())` generated the expected PostgreSQL SERIAL primary key
- All string fields (name, description, image_url, category) mapped directly to PostgreSQL TEXT without size limits, which is appropriate since we're not enforcing character limits at the database level

**Why Float for currency is acceptable here:**
- This is a simple project without real financial transactions
- Float precision (15 decimal digits) is sufficient for typical product prices ($0.01 to $9999.99)
- In production, we would use `Decimal` type for exact currency representation to avoid floating-point errors

### Implementation Decisions Not in Original Spec

**1. Price validation on updates (PUT /products/:id):**
- **Decision:** Applied the same price validation (must be positive number) to updates as we did for creates
- **Reasoning:** The spec didn't explicitly state update validation rules, but allowing negative or zero prices would break order calculations
- **Impact:** PUT requests with invalid prices return 400 Bad Request

**2. Partial updates support:**
- **Decision:** PUT endpoint allows updating any subset of fields (name, description, price, image_url, category) — not requiring all fields
- **Reasoning:** The spec said "all fields optional" but didn't specify how to handle empty requests
- **Implementation:** We validate that at least one field is provided; if no fields, return 400 "No valid fields provided for update"
- **Impact:** More flexible API — clients can update just the price without resending name/description

**3. Error handling for Prisma codes:**
- **Decision:** Explicitly catch Prisma error code `P2025` (record not found) and map it to 404 Not Found
- **Reasoning:** The spec defined 404 responses but didn't specify how to detect them at the database layer
- **Implementation:** Used try/catch with `error.code === 'P2025'` check in UPDATE and DELETE endpoints
- **Impact:** Users get clear 404 responses instead of generic 500 errors when trying to modify nonexistent products

**4. Query parameter filtering and sorting (Enhancement):**
- **Decision:** Extended GET /products to support `category`, `sort`, and `order` query parameters
- **Reasoning:** Frontend needs to filter products by category and sort by price/name without fetching all products
- **Implementation:** 
  - `category` filter uses case-insensitive exact match via Prisma's `mode: 'insensitive'`
  - `sort` accepts `price`, `name`, `id`, `category` — invalid values are ignored (returns unsorted)
  - `order` accepts `asc` or `desc` (defaults to `asc` if not provided)
  - All parameters are optional — no params returns all products unsorted
- **Impact:** More flexible API for frontend filtering/sorting; backward compatible (no breaking changes)
- **Example:** `GET /products?category=Electronics&sort=price&order=desc` returns Electronics sorted by price descending

### Route Behavior Validation

**1. DELETE cascade behavior:**
- **Spec said:** "Deleting a Product should also delete any OrderItem records referencing it"
- **Implementation:** Added `onDelete: Cascade` in Prisma schema (once Order/OrderItem models are added)
- **Status:** Not testable yet (Order models not implemented), but schema is prepared for future cascade deletes
- **Note:** In planning.md Section 1, we documented that product deletion will cascade to order items, which may leave orders with missing line items

**2. GET /products response shape:**
- **Spec said:** Return `{ "products": [...] }` wrapper
- **Implementation:** Confirmed — all endpoints use singular/plural wrappers (`{ "product": {...} }` for single, `{ "products": [...] }` for list)
- **Status:** Matches spec exactly, tested and working

**3. POST /products status code:**
- **Spec said:** 201 Created
- **Implementation:** Returns 201 with the created product in response body
- **Status:** Confirmed — Express `res.status(201).json(...)` working as expected