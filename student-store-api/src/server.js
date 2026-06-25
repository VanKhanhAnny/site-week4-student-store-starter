const express = require("express");
const cors = require("cors");
const Product = require("./models/product");
const Order = require("./models/order");
const OrderItem = require("./models/orderItem");
const prisma = require("./db/db");

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors());
app.use(express.json())

app.get("/", (req, res) => {
    res.status(200).send("Student Store API is running");
});

// GET /products - Fetch all products with optional filtering and sorting
app.get("/products", async (req, res) => {
    try {
        const { category, sort, order } = req.query
        const products = await Product.getAll({ category, sort, order })
        res.status(200).json({ products })
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" })
    }
})

// GET /products/:id - Fetch a specific product by ID
app.get("/products/:id", async (req, res) => {
    try {
        const { id } = req.params

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid product ID" })
        }

        const product = await Product.getById(id)

        if (!product) {
            return res.status(404).json({ error: "Product not found" })
        }

        res.status(200).json({ product })
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch product" })
    }
})

// POST /products - Create a new product
app.post("/products", async (req, res) => {
    try {
        const { name, description, price, image_url, category } = req.body

        if (!name || !description || price === undefined || !image_url || !category) {
            return res.status(400).json({
                error: "Missing required fields: name, description, price, image_url, category"
            })
        }

        if (isNaN(price) || parseFloat(price) <= 0) {
            return res.status(400).json({
                error: "Invalid price: must be a positive number"
            })
        }

        const product = await Product.create({ name, description, price, image_url, category })
        res.status(201).json({ product })
    } catch (error) {
        res.status(500).json({ error: "Failed to create product" })
    }
})

// PUT /products/:id - Update a product
app.put("/products/:id", async (req, res) => {
    try {
        const { id } = req.params
        const { name, description, price, image_url, category } = req.body

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid product ID" })
        }

        const hasValidFields = name || description || price !== undefined || image_url || category
        if (!hasValidFields) {
            return res.status(400).json({ error: "No valid fields provided for update" })
        }

        if (price !== undefined && (isNaN(price) || parseFloat(price) <= 0)) {
            return res.status(400).json({
                error: "Invalid price: must be a positive number"
            })
        }

        const product = await Product.update(id, { name, description, price, image_url, category })
        res.status(200).json({ product })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Product not found" })
        }
        res.status(500).json({ error: "Failed to update product" })
    }
})

// DELETE /products/:id - Delete a product
app.delete("/products/:id", async (req, res) => {
    try {
        const { id } = req.params

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid product ID" })
        }

        await Product.delete(id)
        res.status(200).json({ message: "Product deleted successfully" })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Product not found" })
        }
        res.status(500).json({ error: "Failed to delete product" })
    }
})

// GET /orders - Fetch all orders with optional email filter
app.get("/orders", async (req, res) => {
    try {
        const { email } = req.query
        const orders = await Order.getAll({ email })
        res.status(200).json({ orders })
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" })
    }
})

// GET /orders/:order_id - Fetch a specific order with items
app.get("/orders/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params

        if (isNaN(order_id)) {
            return res.status(400).json({ error: "Invalid order ID" })
        }

        const order = await Order.getById(order_id)

        if (!order) {
            return res.status(404).json({ error: "Order not found" })
        }

        res.status(200).json({ order })
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch order" })
    }
})

// POST /orders - Create a new order with items (validate-first flow)
app.post("/orders", async (req, res) => {
    try {
        const { customer_id, customer_email, status, items } = req.body

        // ========== PHASE 1: VALIDATION (Outside Transaction) ==========

        // Step 1: Validate request structure
        if (!customer_id || !status || !items || items.length === 0) {
            return res.status(400).json({
                error: "Missing required fields: customer_id, status, items"
            })
        }

        // Validate each item has required fields
        for (const item of items) {
            if (!item.product_id || !item.quantity) {
                return res.status(400).json({
                    error: "Each item must have product_id and quantity"
                })
            }
            if (isNaN(item.quantity) || parseInt(item.quantity) <= 0) {
                return res.status(400).json({
                    error: `Invalid quantity for product ${item.product_id}: must be a positive integer`
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

        // Step 4: Build items with prices (snapshot from Product)
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

        const order = await Order.createWithItems(customer_id, status, total_price, itemsWithPrices, customer_email)

        res.status(201).json({ order })
    } catch (error) {
        res.status(500).json({ error: "Transaction failed: unable to create order" })
    }
})

// PUT /orders/:order_id - Update an order
app.put("/orders/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params
        const { status, total_price } = req.body

        if (isNaN(order_id)) {
            return res.status(400).json({ error: "Invalid order ID" })
        }

        const hasValidFields = status || total_price !== undefined
        if (!hasValidFields) {
            return res.status(400).json({ error: "No valid fields provided for update" })
        }

        if (total_price !== undefined && (isNaN(total_price) || parseFloat(total_price) < 0)) {
            return res.status(400).json({
                error: "Invalid total_price: must be a non-negative number"
            })
        }

        const order = await Order.update(order_id, { status, total_price })
        res.status(200).json({ order })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Order not found" })
        }
        res.status(500).json({ error: "Failed to update order" })
    }
})

// DELETE /orders/:order_id - Delete an order
app.delete("/orders/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params

        if (isNaN(order_id)) {
            return res.status(400).json({ error: "Invalid order ID" })
        }

        await Order.delete(order_id)
        res.status(200).json({ message: "Order deleted successfully" })
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Order not found" })
        }
        res.status(500).json({ error: "Failed to delete order" })
    }
})

// GET /order-items - Fetch all order items (Stretch Feature)
app.get("/order-items", async (req, res) => {
    try {
        const orderItems = await OrderItem.getAll()
        res.status(200).json({ orderItems })
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch order items" })
    }
})

// POST /orders/:order_id/items - Add a new item to an existing order (Stretch Feature)
app.post("/orders/:order_id/items", async (req, res) => {
    try {
        const { order_id } = req.params
        const { product_id, quantity } = req.body

        // Validate order_id
        if (isNaN(order_id)) {
            return res.status(400).json({ error: "Invalid order ID" })
        }

        // Validate request body
        if (!product_id || !quantity) {
            return res.status(400).json({
                error: "Missing required fields: product_id, quantity"
            })
        }

        if (isNaN(quantity) || parseInt(quantity) <= 0) {
            return res.status(400).json({
                error: "Invalid quantity: must be a positive integer"
            })
        }

        // Check if order exists
        const order = await Order.getById(order_id)
        if (!order) {
            return res.status(404).json({ error: "Order not found" })
        }

        // Check if product exists and get its current price
        const product = await Product.getById(product_id)
        if (!product) {
            return res.status(404).json({ error: `Product with ID ${product_id} not found` })
        }

        // Create the order item with current product price
        const orderItem = await OrderItem.create(
            order_id,
            product_id,
            quantity,
            product.price
        )

        // Update order total_price
        const itemPrice = product.price * parseInt(quantity)
        const newTotalPrice = order.total_price + itemPrice
        await Order.update(order_id, { total_price: newTotalPrice })

        res.status(201).json({ orderItem })
    } catch (error) {
        res.status(500).json({ error: "Failed to add item to order" })
    }
})

const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
})

const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down server...`)

    server.close(async () => {
        try {
            await prisma.$disconnect()
            console.log("Database disconnected")
        } catch (error) {
            console.error("Error while disconnecting database:", error)
        } finally {
            process.exit(0)
        }
    })
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGHUP", () => shutdown("SIGHUP"))

// Nodemon sends SIGUSR2 on restarts; allow clean restart handling.
process.once("SIGUSR2", () => {
    shutdown("SIGUSR2").finally(() => {
        process.kill(process.pid, "SIGUSR2")
    })
})
