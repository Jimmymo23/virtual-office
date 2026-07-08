const router = require('express').Router()
const { requireAuth, requireRole } = require('../middleware/auth')
const prisma = require('../utils/prisma')

router.get('/attendance', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { from, to } = req.query

    let startDate = from ? new Date(from) : new Date()
    let endDate = to ? new Date(to) : new Date()

    if (!from) startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    const logs = await prisma.attendanceLog.findMany({
      where: {
        clockIn: { gte: startDate, lte: endDate }
      },
      include: {
        user: {
          select: { id: true, displayName: true, username: true, role: true, status: true, avatarColor: true, avatarTextColor: true }
        }
      },
      orderBy: { clockIn: 'desc' }
    })

    const users = await prisma.user.findMany({
      select: { id: true, displayName: true, username: true, role: true, status: true, avatarColor: true, avatarTextColor: true }
    })

    res.json({ logs, users, range: { from: startDate, to: endDate } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
