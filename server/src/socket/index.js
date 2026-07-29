const { verifyToken } = require('../utils/jwt')
const prisma = require('../utils/prisma')

const connectedUsers = new Map()
const connectionCounts = new Map()

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
      select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true, avatarId: true, status: true, role: true, officeId: true, approvalStatus: true },
    })

    if (!user || user.approvalStatus !== 'APPROVED' || !user.officeId) {
      socket.disconnect(true)
      return
    }

    const officeChannel = 'office:' + user.officeId
    socket.officeId = user.officeId
    socket.join(officeChannel)

    const prevCount = connectionCounts.get(userId) || 0
    connectionCounts.set(userId, prevCount + 1)

    if (prevCount === 0) {
      connectedUsers.set(userId, {
        socketId: socket.id,
        userId,
        officeId: user.officeId,
        roomId: null,
        x: 8,
        y: 3,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarTextColor: user.avatarTextColor,
        avatarId: user.avatarId || 'avatar1',
        status: user.status,
      })
      io.to(officeChannel).emit('user:connected', { user, position: { x: 8, y: 3 } })
    } else {
      const state = connectedUsers.get(userId)
      if (state) state.socketId = socket.id
    }

    socket.emit('presence:snapshot', getPresenceSnapshot(user.officeId))

    socket.on('player:move', async ({ x, y, roomId }) => {
      const state = connectedUsers.get(userId)
      if (!state) return

      const prevRoomId = state.roomId
      state.x = x
      state.y = y

      if (roomId !== prevRoomId) {
        if (prevRoomId) {
          const oldChannel = 'room:' + state.officeId + ':' + prevRoomId
          socket.leave(oldChannel)
          socket.to(oldChannel).emit('room:player_left', { userId })
          socket.to(oldChannel).emit('voice:peer_left', { userId })
        }
        if (roomId) {
          const newChannel = 'room:' + state.officeId + ':' + roomId
          socket.join(newChannel)
          socket.to(newChannel).emit('room:player_entered', { userId, user })
          socket.emit('room:joined', { roomId })
        }
        state.roomId = roomId || null
      }

      io.to(officeChannel).emit('player:moved', { userId, x, y, roomId })
    })

    socket.on('status:change', async ({ status }) => {
      const valid = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']
      if (!valid.includes(status)) return
      await prisma.user.update({ where: { id: userId }, data: { status } })
      const state = connectedUsers.get(userId)
      if (state) state.status = status
      io.to(officeChannel).emit('user:status_changed', { userId, status })
    })

    socket.on('room:send_message', async ({ roomId, body, parentMsgId }) => {
      if (!body || !body.trim()) return
      const state = connectedUsers.get(userId)
      if (!state || state.roomId !== roomId) return

      const msg = await prisma.message.create({
        data: {
          senderId: userId,
          officeId: state.officeId,
          channelType: 'ROOM',
          channelId: roomId,
          roomId: null,
          parentMsgId: parentMsgId || null,
          body: body.trim(),
        },
        include: { sender: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } },
      })

      msg.roomId = roomId
      io.to('room:' + state.officeId + ':' + roomId).emit('room:new_message', { message: msg })
    })

    socket.on('dm:send', async ({ toUserId, body }) => {
      if (!body || !body.trim()) return
      const state = connectedUsers.get(userId)
      const target = connectedUsers.get(toUserId)
      if (target && state && target.officeId !== state.officeId) return

      const channelId = [userId, toUserId].sort().join(':')
      const msg = await prisma.message.create({
        data: {
          senderId: userId,
          officeId: state ? state.officeId : null,
          channelType: 'DM',
          channelId,
          body: body.trim(),
        },
        include: { sender: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } },
      })

      if (target) io.to(target.socketId).emit('dm:new_message', { message: msg, channelId })
      socket.emit('dm:new_message', { message: msg, channelId })
    })

    // ---- WebRTC voice signaling ----
    // A peer that just joined a voice room asks who else is already there,
    // then sends an offer to each. The relay never inspects SDP/ICE content.

    socket.on('voice:join', ({ roomId }) => {
      const state = connectedUsers.get(userId)
      if (!state || state.roomId !== roomId) return
      const channel = 'room:' + state.officeId + ':' + roomId

      const peers = []
      const room = io.sockets.adapter.rooms.get(channel)
      if (room) {
        for (const sockId of room) {
          if (sockId === socket.id) continue
          const s = io.sockets.sockets.get(sockId)
          if (s && s.userId !== userId) peers.push(s.userId)
        }
      }
      socket.emit('voice:existing_peers', { peers })
    })

    socket.on('voice:signal', ({ toUserId, signal }) => {
      const target = connectedUsers.get(toUserId)
      if (!target) return
      const state = connectedUsers.get(userId)
      if (!state || target.officeId !== state.officeId) return
      io.to(target.socketId).emit('voice:signal', { fromUserId: userId, signal })
    })

    socket.on('voice:leave', ({ roomId }) => {
      const state = connectedUsers.get(userId)
      if (!state) return
      const channel = 'room:' + state.officeId + ':' + roomId
      socket.to(channel).emit('voice:peer_left', { userId })
    })

    socket.on('disconnect', async () => {
      const remaining = (connectionCounts.get(userId) || 1) - 1
      if (remaining > 0) {
        connectionCounts.set(userId, remaining)
        return
      }
      connectionCounts.delete(userId)

      const state = connectedUsers.get(userId)
      if (state && state.roomId) {
        const channel = 'room:' + state.officeId + ':' + state.roomId
        socket.to(channel).emit('room:player_left', { userId })
        socket.to(channel).emit('voice:peer_left', { userId })
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

      io.to(officeChannel).emit('user:disconnected', { userId })
    })
  })
}

function getPresenceSnapshot(officeId) {
  const snapshot = []
  for (const entry of connectedUsers.values()) {
    if (entry.officeId === officeId) snapshot.push(entry)
  }
  return snapshot
}

module.exports = { initSocket, connectedUsers }
