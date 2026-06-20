const prisma = require('../db/db')

class Product {
  static async getAll() {
    return await prisma.product.findMany()
  }

  static async getById(id) {
    return await prisma.product.findUnique({
      where: { id: parseInt(id) }
    })
  }

  static async create(data) {
    return await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        image_url: data.image_url,
        category: data.category
      }
    })
  }

  static async update(id, data) {
    const updateData = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.price !== undefined) updateData.price = parseFloat(data.price)
    if (data.image_url !== undefined) updateData.image_url = data.image_url
    if (data.category !== undefined) updateData.category = data.category

    return await prisma.product.update({
      where: { id: parseInt(id) },
      data: updateData
    })
  }

  static async delete(id) {
    return await prisma.product.delete({
      where: { id: parseInt(id) }
    })
  }
}

module.exports = Product
