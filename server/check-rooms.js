const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const rooms = await prisma.room.findMany({
    select: { id: true, name: true, officeId: true, voiceMode: true, zoneX: true, zoneY: true, zoneW: true, zoneH: true, color: true, guestAccessible: true, isLockable: true, hasVideo: true }
  })
  console.log(JSON.stringify(rooms, null, 2))
}

main().finally(() => prisma.$disconnect())
