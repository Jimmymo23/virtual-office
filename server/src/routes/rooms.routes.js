const router = require('express').Router()
const { requireAuth, requireRole } = require('../middleware/auth')
const prisma = require('../utils/prisma')

router.get('/', requireAuth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { officeId: req.user.officeId },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ rooms })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name, voiceMode, hasVideo, capacity, isLockable, guestAccessible, zoneX, zoneY, zoneW, zoneH, color } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Room name required' })

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        officeId: req.user.officeId,
        voiceMode: voiceMode || 'MUTED',
        hasVideo: !!hasVideo,
        capacity: capacity || 10,
        isLockable: !!isLockable,
        guestAccessible: !!guestAccessible,
        zoneX: zoneX ?? 0,
        zoneY: zoneY ?? 0,
        zoneW: zoneW ?? 5,
        zoneH: zoneH ?? 5,
        color: color || '#E1F5EE',
      }
    })
    res.status(201).json({ room })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.officeId !== req.user.officeId) {
      return res.status(404).json({ error: 'Room not found' })
    }
    const { name, voiceMode, hasVideo, capacity, isLockable, guestAccessible, zoneX, zoneY, zoneW, zoneH, color } = req.body
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(voiceMode !== undefined && { voiceMode }),
        ...(hasVideo !== undefined && { hasVideo: !!hasVideo }),
        ...(capacity !== undefined && { capacity }),
        ...(isLockable !== undefined && { isLockable: !!isLockable }),
        ...(guestAccessible !== undefined && { guestAccessible: !!guestAccessible }),
        ...(zoneX !== undefined && { zoneX }),
        ...(zoneY !== undefined && { zoneY }),
        ...(zoneW !== undefined && { zoneW }),
        ...(zoneH !== undefined && { zoneH }),
        ...(color !== undefined && { color }),
      }
    })
    res.json({ room })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.officeId !== req.user.officeId) {
      return res.status(404).json({ error: 'Room not found' })
    }
    await prisma.room.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
