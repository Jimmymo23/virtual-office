const router = require('express').Router()
const { requireAuth, requireRole } = require('../middleware/auth')
const prisma = require('../utils/prisma')

function officeFilter(user) {
  if (user.role === 'SUPERADMIN') return {}
  return { officeId: user.officeId }
}

router.get('/attendance', requireAuth, requireRole('SUPERADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { from, to } = req.query
    let startDate = from ? new Date(from) : new Date()
    let endDate = to ? new Date(to) : new Date()
    if (!from) startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    const logs = await prisma.attendanceLog.findMany({
      where: { clockIn: { gte: startDate, lte: endDate }, ...officeFilter(req.user) },
      include: {
        user: { select: { id: true, displayName: true, username: true, role: true, status: true, avatarColor: true, avatarTextColor: true } }
      },
      orderBy: { clockIn: 'desc' }
    })

    const users = await prisma.user.findMany({
      where: { approvalStatus: 'APPROVED', ...officeFilter(req.user) },
      select: { id: true, displayName: true, username: true, role: true, status: true, avatarColor: true, avatarTextColor: true }
    })

    res.json({ logs, users, range: { from: startDate, to: endDate } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/attendance/export', requireAuth, requireRole('SUPERADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { from, to } = req.query
    let startDate = from ? new Date(from) : new Date()
    let endDate = to ? new Date(to) : new Date()
    if (!from) startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    const logs = await prisma.attendanceLog.findMany({
      where: { clockIn: { gte: startDate, lte: endDate }, ...officeFilter(req.user) },
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
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"')
    res.send(csv)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/users', requireAuth, requireRole('SUPERADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'GUEST' }, approvalStatus: 'APPROVED', ...officeFilter(req.user) },
      select: { id: true, displayName: true, username: true, role: true, avatarColor: true, avatarTextColor: true, status: true }
    })
    res.json({ users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/users/assignable', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'GUEST' }, approvalStatus: 'APPROVED', officeId: req.user.officeId },
      select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true }
    })
    res.json({ users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/pending', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const pending = await prisma.user.findMany({
      where: { approvalStatus: 'PENDING', ...officeFilter(req.user) },
      select: { id: true, displayName: true, username: true, createdAt: true, avatarColor: true, avatarTextColor: true, office: { select: { name: true } } },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ pending })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/pending/:id/approve', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (req.user.role !== 'SUPERADMIN') {
      const target = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!target || target.officeId !== req.user.officeId) {
        return res.status(403).json({ error: 'Not in your office' })
      }
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'APPROVED' },
      select: { id: true, displayName: true, username: true }
    })
    res.json({ user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/pending/:id/reject', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (req.user.role !== 'SUPERADMIN') {
      const target = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!target || target.officeId !== req.user.officeId) {
        return res.status(403).json({ error: 'Not in your office' })
      }
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'REJECTED' },
      select: { id: true, displayName: true, username: true }
    })
    res.json({ user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/users/:id', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    if (req.user.role !== 'SUPERADMIN') {
      const target = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!target || target.officeId !== req.user.officeId) {
        return res.status(403).json({ error: 'Not in your office' })
      }
      if (req.body.role === 'SUPERADMIN') {
        return res.status(403).json({ error: 'Cannot grant superadmin' })
      }
    }
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

router.get('/offices', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const offices = await prisma.office.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ offices })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/offices', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Office name required' })
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const existing = await prisma.office.findUnique({ where: { slug } })
    if (existing) return res.status(409).json({ error: 'An office with a similar name exists' })
    const office = await prisma.office.create({ data: { name: name.trim(), slug } })
    res.status(201).json({ office })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/users/:id', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (target.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'Cannot delete a superadmin account' })
    }
    if (target.id === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' })
    }
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error. This user may have related data (tasks, messages) that must be reassigned or removed first.' })
  }
})

router.delete('/offices/:id', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const office = await prisma.office.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true } } } })
    if (!office) return res.status(404).json({ error: 'Office not found' })
    if (office._count.users > 0) {
      return res.status(400).json({ error: `Cannot delete office with ${office._count.users} user(s). Remove or reassign users first.` })
    }
    await prisma.office.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
