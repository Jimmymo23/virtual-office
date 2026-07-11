const { verifyToken } = require('../utils/jwt')
const prisma = require('../utils/prisma')

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    const queryToken = req.query.token
    if (!header && !queryToken) {
      return res.status(401).json({ error: 'No token provided' })
    }
    const token = queryToken || header.split(' ')[1]
    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

module.exports = { requireAuth, requireRole }
