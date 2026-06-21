const express = require("express");
const Product = require("./models/product");

const app = express()
const PORT = process.env.PORT || 3001

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

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
});
