const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const room = await prisma.room.findUnique({ where: { id: 'reception' } })
  console.log(JSON.stringify(room, null, 2))
}

main().finally(() => prisma.$disconnect())
