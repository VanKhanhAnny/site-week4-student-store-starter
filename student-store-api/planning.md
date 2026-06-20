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
- `total_price` - String - Required (stored as string to preserve precision for currency)
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

**Cascade Behavior:**
OrderItem sits at the intersection of two cascade delete rules:
1. If the parent Order is deleted → this OrderItem is deleted
2. If the referenced Product is deleted → this OrderItem is deleted

**Cascade Conflict Scenario:**
If a Product is deleted while it appears in an active Order:
- The OrderItem records linking that product to any orders will be deleted (due to Product cascade)
- The Order itself remains intact but loses those line items
- The Order's total_price becomes stale and needs recalculation
- **Design Decision:** We accept this behavior because:
  - Products being deleted mid-order is an edge case that should be handled by business logic
  - Keeping orphaned order items would break referential integrity
  - Orders maintain a snapshot of the purchase event even if line items are removed
  - Alternative would be to prevent product deletion if referenced in orders, but that adds complexity

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
- Query params: None
- Body: None

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
      "total_price": "1999.98",
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
    "total_price": "1999.98",
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
    "total_price": "2499.97",
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
    "total_price": "2499.97",
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

#### Step 1: Validation (Before Transaction)
1. Check that `customer_id`, `status`, and `items` are present
2. Verify `items` is a non-empty array
3. Validate each item has `product_id` (integer) and `quantity` (positive integer)

If validation fails → return 400 Bad Request immediately, no database operations

#### Step 2: Begin Transaction
Use Prisma transaction to ensure atomicity:
```javascript
await prisma.$transaction(async (tx) => {
  // All operations happen inside this transaction
})
```

#### Step 3: Fetch Product Data (Inside Transaction)
For each item in the request:
1. Query the Product table for the product_id
2. If product doesn't exist → throw error, rollback transaction → return 404 Not Found
3. If product exists → extract current price
4. Store: `{ product_id, quantity, price: product.price }`

**Why fetch prices here?**
- Client doesn't send prices (security: prevent price tampering)
- We capture price at order time (historical accuracy: product prices may change later)
- Each order item stores the price it was purchased at

#### Step 4: Calculate Total Price (Inside Transaction)
1. For each validated item: `item.price * item.quantity`
2. Sum all item subtotals
3. Convert to string for storage: `total_price = sum.toFixed(2)`

**Why calculate server-side?**
- Client cannot be trusted with financial calculations
- Prevents price manipulation attacks
- Ensures consistency with product prices fetched from database

#### Step 5: Create Order Record (Inside Transaction)
Execute:
```javascript
const order = await tx.order.create({
  data: {
    customer_id,
    total_price,
    status,
    created_at: new Date()
  }
})
```

Capture the auto-generated `order.order_id` for next step.

#### Step 6: Create Order Item Records (Inside Transaction)
For each item in the validated items list:
```javascript
await tx.orderItem.create({
  data: {
    order_id: order.order_id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price
  }
})
```

**Batch or Loop?**
- Can use `createMany` for efficiency, but must ensure all items reference the same order_id
- Alternative: loop with individual `create` calls for better error messages

#### Step 7: Fetch Created Order with Items (Inside Transaction)
Before committing, fetch the complete order with joined order items:
```javascript
const completeOrder = await tx.order.findUnique({
  where: { order_id: order.order_id },
  include: {
    items: true
  }
})
```

This is the response body we'll return to the client.

#### Step 8: Commit Transaction
If all operations succeed:
- Transaction commits automatically
- Database changes are persisted
- Return 201 Created with `completeOrder`

If any operation fails:
- Transaction rolls back automatically
- No database changes persist
- Return appropriate error status and message

### Error Scenarios and Rollback Behavior

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
1. Transaction begins
2. Step 3: Query for product_id=999 returns null
3. Throw error: "Product with ID 999 not found"
4. Transaction rolls back
5. No Order created, no OrderItem created
6. Response: 404 Not Found

**Key Point:** The order is never created because product validation happens before order creation within the transaction.

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
1. Transaction begins
2. Step 3: Fetch product_id=5 → success
3. Step 3: Fetch product_id=999 → fails
4. Throw error on first invalid product
5. Transaction rolls back
6. Order item for product_id=5 is NOT created (rollback undoes everything)
7. Response: 404 Not Found with message about product 999

**Key Point:** Even though one product was valid, nothing is saved. All-or-nothing.

#### Scenario 3: Database Constraint Violation
**Request:** (Valid, but database fails mid-transaction due to infrastructure issue)

**What happens:**
1. Transaction begins
2. Steps 3-5 succeed
3. Step 6: Database connection lost or constraint violation
4. Prisma throws error
5. Transaction rolls back automatically
6. Response: 500 Internal Server Error

**Key Point:** Transactional integrity protects against partial writes even during infrastructure failures.

### Response Success Case
If everything succeeds, return:
```json
{
  "order": {
    "order_id": 1,
    "customer_id": 123,
    "total_price": "2499.97",
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

### Prisma Transaction Pattern
```javascript
app.post('/orders', async (req, res) => {
  const { customer_id, status, items } = req.body
  
  // Validation happens before transaction
  if (!customer_id || !status || !items || items.length === 0) {
    return res.status(400).json({ error: "Missing required fields" })
  }
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all products and validate
      const itemsWithPrices = []
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.product_id }
        })
        if (!product) {
          throw new Error(`Product with ID ${item.product_id} not found`)
        }
        itemsWithPrices.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price
        })
      }
      
      // Calculate total
      const total_price = itemsWithPrices
        .reduce((sum, item) => sum + (item.price * item.quantity), 0)
        .toFixed(2)
      
      // Create order
      const order = await tx.order.create({
        data: { customer_id, status, total_price, created_at: new Date() }
      })
      
      // Create order items
      await tx.orderItem.createMany({
        data: itemsWithPrices.map(item => ({
          order_id: order.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }))
      })
      
      // Fetch complete order with items
      return await tx.order.findUnique({
        where: { order_id: order.order_id },
        include: { items: true }
      })
    })
    
    res.status(201).json({ order: result })
    
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message })
    } else {
      res.status(500).json({ error: "Transaction failed" })
    }
  }
})
```

### Why This Matters
The transactional flow ensures:
1. **Atomicity:** Order and all its items are created together or not at all
2. **Consistency:** Total price always matches the sum of order items
3. **Isolation:** Concurrent requests don't interfere with each other
4. **Durability:** Once the response is sent, the data is guaranteed to be saved

Without transactions, we could end up with:
- Orders with no items
- Orders with only some items
- Incorrect total prices
- Database corruption from partial writes

This is why POST /orders is the most critical endpoint to get right.
