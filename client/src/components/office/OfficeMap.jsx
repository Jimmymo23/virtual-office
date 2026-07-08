import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useOfficeStore } from '../../store/officeStore'
import styles from './OfficeMap.module.css'

const TILE = 48
const COLS = 24
const ROWS = 16

const ROOM_DEFS = [
  { id: 'open-desks', name: 'open desks', x: 1, y: 1, w: 10, h: 5, color: '#E1F5EE', border: '#5DCAA5', voiceMode: 'MUTED' },
  { id: 'meeting-1', name: 'meeting room 1', x: 1, y: 7, w: 10, h: 7, color: '#FAEEDA', border: '#EF9F27', voiceMode: 'ALWAYS_ON', hasVideo: true, lockable: true },
  { id: 'kitchen', name: 'kitchen', x: 13, y: 1, w: 5, h: 6, color: '#F1EFE8', border: '#B4B2A9', voiceMode: 'ALWAYS_ON' },
  { id: 'focus', name: 'focus room', x: 13, y: 8, w: 5, h: 6, color: '#EEEDFE', border: '#AFA9EC', voiceMode: 'MUTED' },
  { id: 'reception', name: 'reception', x: 19, y: 1, w: 4, h: 13, color: '#E6F1FB', border: '#85B7EB', voiceMode: 'PUSH_TO_TALK' },
]

const FURNITURE = [
  { type: 'desk', x: 2, y: 2 }, { type: 'desk', x: 4, y: 2 }, { type: 'desk', x: 6, y: 2 },
  { type: 'desk', x: 2, y: 4 }, { type: 'desk', x: 4, y: 4 }, { type: 'desk', x: 6, y: 4 },
  { type: 'table', x: 3, y: 9 }, { type: 'table', x: 5, y: 9 },
  { type: 'chair', x: 3, y: 8 }, { type: 'chair', x: 5, y: 8 }, { type: 'chair', x: 4, y: 8 },
  { type: 'chair', x: 3, y: 11 }, { type: 'chair', x: 5, y: 11 }, { type: 'chair', x: 4, y: 11 },
  { type: 'plant', x: 13, y: 1 }, { type: 'plant', x: 17, y: 1 },
  { type: 'sofa', x: 14, y: 3 }, { type: 'sofa', x: 15, y: 3 },
  { type: 'plant', x: 19, y: 13 },
  { type: 'desk', x: 20, y: 3 }, { type: 'desk', x: 21, y: 3 },
]

function getRoomAt(x, y) {
  return ROOM_DEFS.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || null
}

function isWall(x, y) {
  return x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1
}

function isFurniture(x, y) {
  return FURNITURE.some(f => f.x === x && f.y === y)
}

function isBlocked(x, y) {
  return isWall(x, y) || isFurniture(x, y)
}

export default function OfficeMap({ onRoomChange }) {
  const user = useAuthStore(s => s.user)
  const { players, socket, currentRoomId, setCurrentRoom } = useOfficeStore()

  const posRef = useRef({ x: 8, y: 3 })
  const containerRef = useRef()

  const move = useCallback((dx, dy) => {
    if (!socket) return
    const { x, y } = posRef.current
    const nx = x + dx
    const ny = y + dy
    if (isBlocked(nx, ny)) return

    posRef.current = { x: nx, y: ny }

    const room = getRoomAt(nx, ny)
    const roomId = room?.id || null

    socket.emit('player:move', { x: nx, y: ny, roomId })

    if (roomId !== currentRoomId) {
      setCurrentRoom(roomId)
      onRoomChange?.(room)
    }

    const el = document.getElementById('my-avatar')
    if (el) {
      el.style.left = `${nx * TILE}px`
      el.style.top = `${ny * TILE}px`
    }
  }, [socket, currentRoomId, setCurrentRoom, onRoomChange])

  useEffect(() => {
    const handler = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
        e.preventDefault()
        if (e.key === 'ArrowUp' || e.key === 'w') move(0, -1)
        if (e.key === 'ArrowDown' || e.key === 's') move(0, 1)
        if (e.key === 'ArrowLeft' || e.key === 'a') move(-1, 0)
        if (e.key === 'ArrowRight' || e.key === 'd') move(1, 0)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [move])

  const myPos = posRef.current

  return (
    <div className={styles.wrap} ref={containerRef} tabIndex={0}>
      <div className={styles.map} style={{ width: COLS * TILE, height: ROWS * TILE }}>
        <div className={styles.floor} />

        {ROOM_DEFS.map(room => (
          <div
            key={room.id}
            className={styles.room}
            style={{
              left: room.x * TILE, top: room.y * TILE,
              width: room.w * TILE, height: room.h * TILE,
              background: room.color,
              border: `1.5px solid ${room.border}`,
            }}
          >
            <span className={styles.roomLabel} style={{ color: room.border }}>{room.name}</span>
            {room.voiceMode === 'ALWAYS_ON' && <span className={styles.voiceBadge} style={{ background: room.border + '33', color: room.border }}>voice on</span>}
            {room.voiceMode === 'MUTED' && <span className={styles.voiceBadge} style={{ background: '#F1EFE8', color: '#888780' }}>muted</span>}
          </div>
        ))}

        {FURNITURE.map((f, i) => (
          <div key={i} className={`${styles.furniture} ${styles[f.type]}`} style={{ left: f.x * TILE, top: f.y * TILE }} />
        ))}

        {Object.entries(players)
          .filter(([id]) => id !== user?.id)
          .map(([id, p]) => (
            <div key={id} className={styles.avatar} style={{ left: (p.x || 2) * TILE, top: (p.y || 2) * TILE }}>
              <div className={styles.avatarCircle} style={{ background: p.avatarColor || '#E1F5EE', color: p.avatarTextColor || '#085041' }}>
                {(p.displayName || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.avatarName}>{p.displayName?.split(' ')[0]}</div>
              <div className={`${styles.statusDot} ${styles[p.status?.toLowerCase() || 'offline']}`} />
            </div>
          ))}

        <div id="my-avatar" className={`${styles.avatar} ${styles.me}`} style={{ left: myPos.x * TILE, top: myPos.y * TILE }}>
          <div className={styles.avatarCircle} style={{ background: user?.avatarColor || '#EEEDFE', color: user?.avatarTextColor || '#534AB7' }}>
            {(user?.displayName || 'ME').slice(0, 2).toUpperCase()}
          </div>
          <div className={styles.avatarName}>{user?.displayName?.split(' ')[0]} (you)</div>
          <div className={`${styles.statusDot} ${styles.online}`} />
        </div>
      </div>

      <div className={styles.hint}>
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys to move
      </div>
    </div>
  )
}
