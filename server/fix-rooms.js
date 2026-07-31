const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const UPDATES = {
  'open-desks':  { name: 'open desks',     voiceMode: 'MUTED',        zoneX: 1,  zoneY: 1, zoneW: 10, zoneH: 5,  color: '#E1F5EE' },
  'meeting-1':   { name: 'meeting room 1', voiceMode: 'ALWAYS_ON',    zoneX: 1,  zoneY: 7, zoneW: 10, zoneH: 7,  color: '#FAEEDA', hasVideo: true, isLockable: true },
  'kitchen':     { name: 'kitchen',        voiceMode: 'ALWAYS_ON',    zoneX: 13, zoneY: 1, zoneW: 5,  zoneH: 6,  color: '#F1EFE8' },
  'focus':       { name: 'focus room',     voiceMode: 'PUSH_TO_TALK', zoneX: 13, zoneY: 8, zoneW: 5,  zoneH: 6,  color: '#EEEDFE' },
  'reception':   { name: 'reception',      voiceMode: 'PUSH_TO_TALK', zoneX: 19, zoneY: 1, zoneW: 4,  zoneH: 13, color: '#E6F1FB', guestAccessible: true },
}

async function main() {
  for (const [id, data] of Object.entries(UPDATES)) {
    try {
      const room = await prisma.room.update({ where: { id }, data })
      console.log('Updated:', room.name, '-> voice:', room.voiceMode, 'zone:', room.zoneX, room.zoneY, room.zoneW, room.zoneH)
    } catch (err) {
      console.log('Skipped (not found):', id)
    }
  }
}

main().finally(() => prisma.$disconnect())
