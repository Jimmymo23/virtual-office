const { verifyToken } = require('../utils/jwt')
const prisma = require('../utils/prisma')

const connectedUsers = new Map()

function initSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('No token'))
      const payload = verifyToken(token)
      socket.userId = payload.userId
      socket.userRole = payload.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.userId



  const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true, avatarId: true, status: true, role: true },
})
    connectedUsers.set(userId, {
  socketId: socket.id,
  userId,
  roomId: null,
  position: { x: 2, y: 2 },
  displayName: user.displayName,
  avatarColor: user.avatarColor,
  avatarTextColor: user.avatarTextColor,
  avatarId: user.avatarId || 'avatar1',
})
    io.emit('user:connected', { user, position: { x: 2, y: 2 } })
    socket.emit('presence:snapshot', getPresenceSnapshot())

    socket.on('player:move', async ({ x, y, roomId }) => {
      const state = connectedUsers.get(userId)
      if (!state) return

      const prevRoomId = state.roomId
      state.position = { x, y }

      if (roomId !== prevRoomId) {
        if (prevRoomId) {
          socket.leave(`room:${prevRoomId}`)
          socket.to(`room:${prevRoomId}`).emit('room:player_left', { userId })
        }
        if (roomId) {
          if (user.role === 'GUEST') {
            const room = await prisma.room.findUnique({ where: { id: roomId } })
            const promotion = await prisma.guestPromotion.findUnique({ where: { guestId: userId } })
            const allowed = room?.guestAccessible ||
              (promotion && promotion.roomAccess.includes(roomId) && (!promotion.expiresAt || new Date() < promotion.expiresAt))
            if (!allowed) {
              socket.emit('room:access_denied', { roomId })
              return
            }
          }
          socket.join(`room:${roomId}`)
          socket.to(`room:${roomId}`).emit('room:player_entered', { userId, user })
          socket.emit('room:joined', { roomId })
        }
        state.roomId = roomId || null
      }

      io.emit('player:moved', { userId, x, y, roomId })
    })

    socket.on('status:change', async ({ status }) => {
      const valid = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']
      if (!valid.includes(status)) return
      await prisma.user.update({ where: { id: userId }, data: { status } })
      io.emit('user:status_changed', { userId, status })
    })

    socket.on('room:send_message', async ({ roomId, body, parentMsgId }) => {
      if (!body?.trim()) return
      const state = connectedUsers.get(userId)
      if (state?.roomId !== roomId) return

      const msg = await prisma.message.create({
        data: {
          senderId: userId,
          channelType: 'ROOM',
          channelId: roomId,
          roomId,
          parentMsgId: parentMsgId || null,
          body: body.trim(),
        },
        include: { sender: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } },
      })

      io.to(`room:${roomId}`).emit('room:new_message', { message: msg })
    })

    socket.on('dm:send', async ({ toUserId, body }) => {
      if (!body?.trim()) return
      const channelId = [userId, toUserId].sort().join(':')

      const msg = await prisma.message.create({
        data: {
          senderId: userId,
          channelType: 'DM',
          channelId,
          body: body.trim(),
        },
        include: { sender: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } },
      })

      const toUser = connectedUsers.get(toUserId)
      if (toUser) {
        io.to(toUser.socketId).emit('dm:new_message', { message: msg, channelId })
      }
      socket.emit('dm:new_message', { message: msg, channelId })
    })

    socket.on('room:knock', async ({ roomId }) => {
      const room = await prisma.room.findUnique({ where: { id: roomId } })
      if (!room?.lockedById) return
      const host = connectedUsers.get(room.lockedById)
      if (host) {
        io.to(host.socketId).emit('room:knock_received', { fromUserId: userId, fromUser: user, roomId })
      }
    })

    socket.on('room:lock', async ({ roomId, lock }) => {
      await prisma.room.update({
        where: { id: roomId },
        data: { lockedById: lock ? userId : null },
      })
      io.emit('room:lock_changed', { roomId, locked: lock, byUserId: lock ? userId : null })
    })

    socket.on('guest:promote', async ({ guestId, roomAccess, expiresAt }) => {
      if (!['ADMIN', 'MANAGER', 'STAFF'].includes(socket.userRole)) return
      const existing = await prisma.guestPromotion.findUnique({ where: { guestId } })
      const data = { promotedById: userId, roomAccess: roomAccess || [], expiresAt: expiresAt ? new Date(expiresAt) : null }
      if (existing) {
        await prisma.guestPromotion.update({ where: { guestId }, data })
      } else {
        await prisma.guestPromotion.create({ data: { guestId, ...data } })
      }
      const guestSocket = connectedUsers.get(guestId)
      if (guestSocket) {
        io.to(guestSocket.socketId).emit('guest:promoted', { roomAccess, expiresAt })
      }
      io.emit('user:badge_changed', { userId: guestId, badge: 'TEMP' })
    })

    socket.on('disconnect', async () => {
      const state = connectedUsers.get(userId)
      if (state?.roomId) {
        socket.to(`room:${state.roomId}`).emit('room:player_left', { userId })
      }
      connectedUsers.delete(userId)

      await prisma.user.update({ where: { id: userId }, data: { status: 'OFFLINE' } }).catch(() => {})

      const activeLog = await prisma.attendanceLog.findFirst({
        where: { userId, clockOut: null },
        orderBy: { clockIn: 'desc' },
      }).catch(() => null)

      if (activeLog) {
        const now = new Date()
        const minutes = Math.round((now - activeLog.clockIn) / 60000)
        await prisma.attendanceLog.update({
          where: { id: activeLog.id },
          data: { clockOut: now, totalMinutes: minutes },
        }).catch(() => {})
      }

      const activeTimer = await prisma.timeLog.findFirst({
        where: { userId, endedAt: null },
      }).catch(() => null)

      if (activeTimer) {
        const now = new Date()
        const minutes = Math.round((now - activeTimer.startedAt) / 60000)
        await prisma.timeLog.update({
          where: { id: activeTimer.id },
          data: { endedAt: now, minutes },
        }).catch(() => {})
      }

      io.emit('user:disconnected', { userId })
    })
  })
}

function getPresenceSnapshot() {
  const snapshot = []
  for (const [userId, state] of connectedUsers.entries()) {
    snapshot.push(state)
  }
  return snapshot
}

module.exports = { initSocket, connectedUsers }
