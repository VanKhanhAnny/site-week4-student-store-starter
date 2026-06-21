const prisma = require('../db/db')

class OrderItem {
  static async getByOrderId(order_id) {
    return await prisma.orderItem.findMany({
      where: { order_id: parseInt(order_id) },
      include: {
        product: true
      }
    })
  }

  static async create(order_id, product_id, quantity, price) {
    return await prisma.orderItem.create({
      data: {
        order_id: parseInt(order_id),
        product_id: parseInt(product_id),
        quantity: parseInt(quantity),
        price: parseFloat(price)
      }
    })
  }

  static async createMany(orderItems) {
    return await prisma.orderItem.createMany({
      data: orderItems.map(item => ({
        order_id: parseInt(item.order_id),
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price)
      }))
    })
  }
}

module.exports = OrderItem
