import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { useOfficeStore } from '../store/officeStore'

let socketInstance = null

export function useSocket() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const { setSocket, upsertPlayer, removePlayer, addMessage, applyPresenceSnapshot, setOnlineUser, removeOnlineUser } = useOfficeStore()

  useEffect(() => {
    if (!token || !user) return
    if (socketInstance?.connected) { setSocket(socketInstance); return }

    socketInstance = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    })

    socketInstance.on('connect', () => {
      setSocket(socketInstance)
    })

    socketInstance.on('presence:snapshot', (snapshot) => {
      applyPresenceSnapshot(snapshot)
    })

    socketInstance.on('user:connected', ({ user: u, position }) => {
      upsertPlayer(u.id, { ...u, ...position })
      setOnlineUser(u.id, u)
    })

    socketInstance.on('user:disconnected', ({ userId }) => {
      removePlayer(userId)
      removeOnlineUser(userId)
    })

    socketInstance.on('player:moved', ({ userId, x, y, roomId }) => {
      upsertPlayer(userId, { x, y, roomId })
    })

    socketInstance.on('user:status_changed', ({ userId, status }) => {
      upsertPlayer(userId, { status })
      setOnlineUser(userId, { status })
    })

    socketInstance.on('room:new_message', ({ message }) => {
      addMessage(message.roomId, message)
    })

    socketInstance.on('room:lock_changed', ({ roomId, locked, byUserId }) => {
      const { rooms, setRooms } = useOfficeStore.getState()
      setRooms(rooms.map(r => r.id === roomId ? { ...r, lockedById: locked ? byUserId : null } : r))
    })

    socketInstance.on('room:access_denied', ({ roomId }) => {
      console.warn('Access denied to room', roomId)
    })

    socketInstance.on('guest:promoted', ({ roomAccess, expiresAt }) => {
      useAuthStore.getState().setUser({ ...useAuthStore.getState().user, _promoted: true, roomAccess, promotionExpiresAt: expiresAt })
    })

    socketInstance.on('room:knock_received', ({ fromUser, roomId }) => {
      if (window.confirm(`${fromUser.displayName} is knocking on your meeting room. Let them in?`)) {
        socketInstance.emit('guest:promote', { guestId: fromUser.id, roomAccess: [roomId] })
      }
    })

    return () => {
      socketInstance?.off()
    }
  }, [token, user])

  return socketInstance
}
