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
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'GUEST' } },
      select: { id: true, displayName: true, username: true, role: true, avatarColor: true, avatarTextColor: true, status: true }
    })
    res.json({ users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/attendance/export', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { from, to } = req.query
    let startDate = from ? new Date(from) : new Date()
    let endDate = to ? new Date(to) : new Date()
    if (!from) startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    const logs = await prisma.attendanceLog.findMany({
      where: { clockIn: { gte: startDate, lte: endDate } },
      include: { user: { select: { displayName: true, username: true, role: true } } },
      orderBy: [{ date: 'asc' }, { clockIn: 'asc' }]
    })

    const rows = [
      ['Name', 'Username', 'Role', 'Date', 'Clock In', 'Clock Out', 'Total Minutes', 'Total Hours']
    ]

    logs.forEach(log => {
      rows.push([
        log.user.displayName,
        log.user.username,
        log.user.role,
        new Date(log.date).toLocaleDateString(),
        new Date(log.clockIn).toLocaleTimeString(),
        log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : 'active',
        log.totalMinutes || '',
        log.totalMinutes ? (log.totalMinutes / 60).toFixed(2) : ''
      ])
    })

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${from || 'today'}-to-${to || 'today'}.csv"`)
    res.send(csv)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
router.patch('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role, password } = req.body
    const data = {}
    if (role) data.role = role
    if (password) {
      const bcrypt = require('bcryptjs')
      data.passwordHash = await bcrypt.hash(password, 10)
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, displayName: true, username: true, role: true, status: true, avatarColor: true, avatarTextColor: true }
    })
    res.json({ user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
module.exports = router
