import { create } from 'zustand'

export const useOfficeStore = create((set, get) => ({
  socket: null,
  players: {},
  currentRoomId: null,
  rooms: [],
  roomMessages: {},
  onlineUsers: {},

  setSocket: (socket) => set({ socket }),

  setRooms: (rooms) => set({ rooms }),

  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),

  upsertPlayer: (userId, data) => set((state) => ({
    players: { ...state.players, [userId]: { ...(state.players[userId] || {}), ...data } }
  })),

  removePlayer: (userId) => set((state) => {
    const players = { ...state.players }
    delete players[userId]
    return { players }
  }),

  addMessage: (roomId, message) => set((state) => ({
    roomMessages: {
      ...state.roomMessages,
      [roomId]: [...(state.roomMessages[roomId] || []), message],
    }
  })),

  setRoomMessages: (roomId, messages) => set((state) => ({
    roomMessages: { ...state.roomMessages, [roomId]: messages }
  })),

  setOnlineUser: (userId, data) => set((state) => ({
    onlineUsers: { ...state.onlineUsers, [userId]: { ...(state.onlineUsers[userId] || {}), ...data } }
  })),

  removeOnlineUser: (userId) => set((state) => {
    const onlineUsers = { ...state.onlineUsers }
    delete onlineUsers[userId]
    return { onlineUsers }
  }),

  applyPresenceSnapshot: (snapshot) => {
    const players = {}
    snapshot.forEach((s) => { players[s.userId] = s })
    set({ players })
  },
}))
