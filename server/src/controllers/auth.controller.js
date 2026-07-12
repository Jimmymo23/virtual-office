const bcrypt = require('bcryptjs')
const prisma = require('../utils/prisma')
const { signToken } = require('../utils/jwt')

function safeUser(user) {
  const { passwordHash, ...rest } = user
  return rest
}

async function register(req, res) {
  try {
    const { username, displayName, password, role, avatarId } = req.body

    if (!username || !displayName || !password) {
      return res.status(400).json({ error: 'username, displayName and password are required' })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return res.status(409).json({ error: 'Username already taken' })

    const passwordHash = await bcrypt.hash(password, 10)

    const colors = [
      { bg: '#EEEDFE', text: '#534AB7' },
      { bg: '#E1F5EE', text: '#085041' },
      { bg: '#FAEEDA', text: '#633806' },
      { bg: '#FAECE7', text: '#712B13' },
      { bg: '#E6F1FB', text: '#0C447C' },
      { bg: '#EAF3DE', text: '#27500A' },
    ]
    const color = colors[Math.floor(Math.random() * colors.length)]

const user = await prisma.user.create({
  data: {
    username,
    displayName,
    passwordHash,
    role: role || 'STAFF',
    avatarColor: color.bg,
    avatarTextColor: color.text,
    avatarId: avatarId || 'avatar1',
  },
})
    const token = signToken({ userId: user.id, role: user.role })
    res.status(201).json({ token, user: safeUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    if (user.guestExpiresAt && new Date() > user.guestExpiresAt) {
      return res.status(401).json({ error: 'Guest session expired' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE' },
    })

 const log = await prisma.attendanceLog.create({
  data: { userId: user.id },
})
console.log('Attendance log created:', log.id)

    const token = signToken({ userId: user.id, role: user.role })
    res.json({ token, user: safeUser({ ...user, status: 'ONLINE' }) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function logout(req, res) {
  try {
    const userId = req.user.id

    const activeLog = await prisma.attendanceLog.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    })

    if (activeLog) {
      const now = new Date()
      const minutes = Math.round((now - activeLog.clockIn) / 60000)
      await prisma.attendanceLog.update({
        where: { id: activeLog.id },
        data: { clockOut: now, totalMinutes: minutes },
      })
    }

    const activeTimer = await prisma.timeLog.findFirst({
      where: { userId, endedAt: null },
    })
    if (activeTimer) {
      const now = new Date()
      const minutes = Math.round((now - activeTimer.startedAt) / 60000)
      await prisma.timeLog.update({
        where: { id: activeTimer.id },
        data: { endedAt: now, minutes },
      })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'OFFLINE' },
    })

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function me(req, res) {
  res.json({ user: safeUser(req.user) })
}

module.exports = { register, login, logout, me }
