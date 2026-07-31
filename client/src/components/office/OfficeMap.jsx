import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useOfficeStore } from '../../store/officeStore'
import { getAvatarById } from '../avatars/avatarData'
import api from '../../api'
import styles from './OfficeMap.module.css'

const TILE = 48
const COLS = 24
const ROWS = 16

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

const BORDER_COLORS = {
  '#E1F5EE': '#5DCAA5',
  '#FAEEDA': '#EF9F27',
  '#F1EFE8': '#B4B2A9',
  '#EEEDFE': '#AFA9EC',
  '#E6F1FB': '#85B7EB',
}

function getBorderColor(fillColor) {
  return BORDER_COLORS[fillColor] || '#B4B2A9'
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

  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const roomsRef = useRef([])

  const posRef = useRef({ x: 8, y: 3 })
  const containerRef = useRef()

  useEffect(() => {
    let cancelled = false
    api.get('/rooms')
      .then(res => {
        if (cancelled) return
        setRooms(res.data.rooms)
        roomsRef.current = res.data.rooms
        setLoadingRooms(false)
      })
      .catch(() => { if (!cancelled) setLoadingRooms(false) })
    return () => { cancelled = true }
  }, [])

  const getRoomAt = useCallback((x, y) => {
    return roomsRef.current.find(r =>
      x >= r.zoneX && x < r.zoneX + r.zoneW &&
      y >= r.zoneY && y < r.zoneY + r.zoneH
    ) || null
  }, [])

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
  }, [socket, currentRoomId, setCurrentRoom, onRoomChange, getRoomAt])

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag)) return
      if (e.code === 'Space') return
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
  const myAvatar = getAvatarById(user?.avatarId || 'avatar1')

  if (loadingRooms) {
    return (
      <div className={styles.wrap}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:12,color:'#888780'}}>
          loading office...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap} ref={containerRef} tabIndex={0}>
      <div className={styles.map} style={{ width: COLS * TILE, height: ROWS * TILE }}>
        <div className={styles.floor} />

        {rooms.map(room => (
          <div
            key={room.id}
            className={styles.room}
            style={{
              left: room.zoneX * TILE, top: room.zoneY * TILE,
              width: room.zoneW * TILE, height: room.zoneH * TILE,
              background: room.color,
              border: `1.5px solid ${getBorderColor(room.color)}`,
            }}
          >
            <span className={styles.roomLabel} style={{ color: getBorderColor(room.color) }}>{room.name}</span>
            {room.voiceMode === 'ALWAYS_ON' && <span className={styles.voiceBadge} style={{ background: getBorderColor(room.color) + '33', color: getBorderColor(room.color) }}>voice on</span>}
            {room.voiceMode === 'PUSH_TO_TALK' && <span className={styles.voiceBadge} style={{ background: getBorderColor(room.color) + '33', color: getBorderColor(room.color) }}>push to talk</span>}
            {room.voiceMode === 'MUTED' && <span className={styles.voiceBadge} style={{ background: '#F1EFE8', color: '#888780' }}>muted</span>}
          </div>
        ))}

        {FURNITURE.map((f, i) => (
          <div key={i} className={`${styles.furniture} ${styles[f.type]}`} style={{ left: f.x * TILE, top: f.y * TILE }} />
        ))}

        {Object.entries(players)
          .filter(([id]) => id !== user?.id)
          .map(([id, p]) => {
            const av = getAvatarById(p.avatarId || 'avatar1')
            return (
              <div key={id} className={styles.avatar} style={{ left: (p.x || 2) * TILE, top: (p.y || 2) * TILE }}>
                <div className={styles.avatarCircle} style={{ background: 'transparent' }}
                  dangerouslySetInnerHTML={{ __html: av.svg }} />
                <div className={styles.avatarName}>{p.displayName?.split(' ')[0]}</div>
                <div className={`${styles.statusDot} ${styles[p.status?.toLowerCase() || 'offline']}`} />
              </div>
            )
          })}

        <div id="my-avatar" className={`${styles.avatar} ${styles.me}`} style={{ left: myPos.x * TILE, top: myPos.y * TILE }}>
          <div className={styles.avatarCircle} style={{ background: 'transparent' }}
            dangerouslySetInnerHTML={{ __html: myAvatar.svg }} />
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
