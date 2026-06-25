const prisma = require('../db/db')

class Order {
  static async getAll(filters = {}) {
    const where = {}

    // Filter by email if provided (case-insensitive)
    if (filters.email) {
      where.customer_email = {
        contains: filters.email,
        mode: 'insensitive'
      }
    }

    return await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
  }

  static async getById(order_id) {
    return await prisma.order.findUnique({
      where: { order_id: parseInt(order_id) },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })
  }

  static async create(customer_id, status, total_price, customer_email = null) {
    return await prisma.order.create({
      data: {
        customer_id: parseInt(customer_id),
        customer_email,
        status,
        total_price: parseFloat(total_price)
      }
    })
  }

  static async createWithItems(customer_id, status, total_price, itemsWithPrices, customer_email = null) {
    return await prisma.$transaction(async (tx) => {
      // Step 7: Create order
      const order = await tx.order.create({
        data: {
          customer_id: parseInt(customer_id),
          customer_email,
          status,
          total_price: parseFloat(total_price)
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
  }

  static async update(order_id, data) {
    const updateData = {}

    if (data.status !== undefined) updateData.status = data.status
    if (data.total_price !== undefined) updateData.total_price = parseFloat(data.total_price)

    return await prisma.order.update({
      where: { order_id: parseInt(order_id) },
      data: updateData
    })
  }

  static async delete(order_id) {
    return await prisma.order.delete({
      where: { order_id: parseInt(order_id) }
    })
  }
}

module.exports = Order
