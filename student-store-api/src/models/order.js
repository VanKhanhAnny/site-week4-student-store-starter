const prisma = require('../db/db')

class Order {
  static async getAll() {
    return await prisma.order.findMany()
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

  static async create(customer_id, status, total_price) {
    return await prisma.order.create({
      data: {
        customer_id: parseInt(customer_id),
        status,
        total_price: parseFloat(total_price)
      }
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
