const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ROOMS = [
  { name: 'open desks', voiceMode: 'MUTED', zoneX: 1, zoneY: 1, zoneW: 10, zoneH: 5, color: '#E1F5EE' },
  { name: 'meeting room 1', voiceMode: 'ALWAYS_ON', hasVideo: true, isLockable: true, zoneX: 1, zoneY: 7, zoneW: 10, zoneH: 7, color: '#FAEEDA' },
  { name: 'kitchen', voiceMode: 'ALWAYS_ON', zoneX: 13, zoneY: 1, zoneW: 5, zoneH: 6, color: '#F1EFE8' },
  { name: 'focus room', voiceMode: 'PUSH_TO_TALK', zoneX: 13, zoneY: 8, zoneW: 5, zoneH: 6, color: '#EEEDFE' },
  { name: 'reception', voiceMode: 'PUSH_TO_TALK', guestAccessible: true, zoneX: 19, zoneY: 1, zoneW: 4, zoneH: 13, color: '#E6F1FB' },
]

async function main() {
  const office = await prisma.office.findUnique({ where: { slug: 'main-office' } })
  if (!office) {
    console.log('Main Office not found')
    return
  }

  const existing = await prisma.room.findMany({ where: { officeId: office.id } })
  if (existing.length > 0) {
    console.log('Rooms already exist for this office:', existing.map(r => r.name).join(', '))
    console.log('Skipping seed to avoid duplicates. Delete existing rooms first if you want to reseed.')
    return
  }

  for (const r of ROOMS) {
    const room = await prisma.room.create({ data: { ...r, officeId: office.id } })
    console.log('Created:', room.name, room.id)
  }

  console.log('Done seeding rooms for Main Office.')
}

main().finally(() => prisma.$disconnect())
