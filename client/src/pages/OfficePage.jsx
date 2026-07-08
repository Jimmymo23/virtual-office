import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useOfficeStore } from '../store/officeStore'
import { useSocket } from '../hooks/useSocket'
import OfficeMap from '../components/office/OfficeMap'
import api from '../api'
import styles from './OfficePage.module.css'

export default function OfficePage() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { players, currentRoomId, roomMessages, socket } = useOfficeStore()
  const [currentRoom, setCurrentRoom] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [chatInput, setChatInput] = useState('')
  const [clockedIn] = useState(new Date())
  const [elapsed, setElapsed] = useState('0:00:00')
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [allUsers, setAllUsers] = useState([])

  useSocket()

  useEffect(() => {
    const t = setInterval(() => {
      const diff = Math.floor((Date.now() - clockedIn) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(t)
  }, [clockedIn])

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/admin/attendance')
      setAttendanceLogs(res.data.logs)
      setAllUsers(res.data.users)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchAttendance()
      const interval = setInterval(fetchAttendance, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const messages = roomMessages[currentRoomId] || []
  const inThisRoom = Object.values(players).filter(p => p.roomId === currentRoomId)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const tabs = isAdmin ? ['chat', 'tasks', 'people', 'admin'] : ['chat', 'tasks', 'people']

  const sendMessage = () => {
    if (!chatInput.trim() || !currentRoomId || !socket) return
    socket.emit('room:send_message', { roomId: currentRoomId, body: chatInput.trim() })
    setChatInput('')
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.sideTop}>
          <div className={styles.avatar} style={{ background: user?.avatarColor, color: user?.avatarTextColor }}>
            {(user?.displayName || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className={`${styles.navBtn} ${styles.active}`} title="office">🏢</div>
          <div className={styles.navBtn} title="tasks">✅</div>
          <div className={styles.navBtn} title="messages">💬</div>
          <div className={styles.navBtn} title="people">👥</div>
        </div>
        <div className={styles.sideBot}>
          <div className={styles.navBtn} title="settings">⚙️</div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="logout">↩</button>
        </div>
      </aside>

      <div className={styles.leftPanel}>
        <div className={styles.lpHead}>
          <div className={styles.workspaceName}>Acme HQ</div>
          <div className={styles.onlineCount}>{Object.keys(players).length} online</div>
        </div>

        <div className={styles.secLabel}>rooms</div>
        {[
          { id: 'open-desks', name: 'open desks', color: '#639922' },
          { id: 'meeting-1', name: 'meeting room 1', color: '#BA7517' },
          { id: 'kitchen', name: 'kitchen', color: '#639922' },
          { id: 'focus', name: 'focus room', color: '#A32D2D' },
          { id: 'reception', name: 'reception', color: '#639922' },
        ].map(r => {
          const count = Object.values(players).filter(p => p.roomId === r.id).length
          return (
            <div key={r.id} className={`${styles.roomItem} ${currentRoomId === r.id ? styles.active : ''}`}>
              <div className={styles.dot} style={{ background: r.color }} />
              <div className={styles.roomInfo}>
                <div className={styles.roomName}>{r.name}</div>
                <div className={styles.roomMeta}>{count} {count === 1 ? 'person' : 'people'}</div>
              </div>
            </div>
          )
        })}

        {inThisRoom.length > 0 && (
          <>
            <div className={styles.secLabel}>in this room</div>
            {inThisRoom.map(p => (
              <div key={p.userId} className={styles.personRow}>
                <div className={styles.personAvatar} style={{ background: p.avatarColor || '#E1F5EE', color: p.avatarTextColor || '#085041' }}>
                  {(p.displayName || '?').slice(0,2).toUpperCase()}
                </div>
                <div className={styles.personName}>{p.displayName}</div>
                <div className={styles.dot} style={{ background: p.status === 'ONLINE' ? '#639922' : p.status === 'AWAY' ? '#BA7517' : '#A32D2D' }} />
              </div>
            ))}
          </>
        )}

        <div className={styles.clockWrap}>
          <div className={styles.clockRow}>
            <span className={styles.clockLabel}>session</span>
            <span className={styles.clockTime}>{elapsed}</span>
          </div>
          <button className={styles.clockOut} onClick={handleLogout}>clock out</button>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <span className={styles.roomPin}>📍</span>
          <span className={styles.currentRoom}>{currentRoom?.name || 'office lobby'}</span>
          {currentRoom?.voiceMode && (
            <span className={styles.modeBadge}>{currentRoom.voiceMode === 'ALWAYS_ON' ? 'voice on' : currentRoom.voiceMode === 'MUTED' ? 'muted' : 'push-to-talk'}</span>
          )}
          <div className={styles.spacer} />
          <span className={styles.topUser}>{user?.displayName}</span>
          <div className={styles.statusDot} style={{ background: '#639922' }} />
        </div>
        <OfficeMap onRoomChange={setCurrentRoom} />
      </main>

      <aside className={styles.rightPanel}>
        <div className={styles.tabs}>
          {tabs.map(t => (
            <div key={t} className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`} onClick={() => setActiveTab(t)}>{t}</div>
          ))}
        </div>

        {activeTab === 'chat' && (
          <div className={styles.chatPanel}>
            <div className={styles.chatHead}>
              {currentRoom ? currentRoom.name : 'no room'} · {inThisRoom.length} here
            </div>
            <div className={styles.messages}>
              {!currentRoomId && <div className={styles.emptyMsg}>walk into a room to start chatting</div>}
              {messages.map(m => (
                <div key={m.id} className={styles.msg}>
                  <div className={styles.msgAvatar} style={{ background: m.sender?.avatarColor, color: m.sender?.avatarTextColor }}>
                    {(m.sender?.displayName || '?').slice(0,2).toUpperCase()}
                  </div>
                  <div className={styles.msgBody}>
                    <div className={styles.msgMeta}>
                      <span className={styles.msgName}>{m.sender?.displayName}</span>
                      <span className={styles.msgTime}>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={styles.msgText}>{m.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.chatInput}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={currentRoomId ? `message ${currentRoom?.name || 'room'}...` : 'enter a room to chat'}
                disabled={!currentRoomId}
              />
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className={styles.tasksPanel}>
            <div className={styles.chatHead}>my tasks</div>
            <div className={styles.emptyMsg} style={{ padding: '1.5rem 1rem' }}>
              task system coming in phase 2 🚧
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className={styles.peoplePanel}>
            <div className={styles.chatHead}>{Object.keys(players).length} online</div>
            {Object.values(players).map(p => (
              <div key={p.userId} className={styles.personRow} style={{ padding: '5px 12px' }}>
                <div className={styles.personAvatar} style={{ background: p.avatarColor, color: p.avatarTextColor }}>
                  {(p.displayName || '?').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.personName} style={{ fontSize: 11 }}>{p.displayName}</div>
                  <div style={{ fontSize: 10, color: '#888780' }}>{p.roomId || 'lobby'}</div>
                </div>
                <div className={styles.dot} style={{ background: p.status === 'ONLINE' ? '#639922' : '#BA7517' }} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'admin' && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'6px 12px',borderBottom:'0.5px solid #D3D1C7',fontSize:10,color:'#888780',fontWeight:500,display:'flex',justifyContent:'space-between'}}>
              <span>today's attendance</span>
              <span style={{cursor:'pointer',color:'#534AB7'}} onClick={fetchAttendance}>↻ refresh</span>
            </div>
            <div style={{flex:1,overflowY:'auto'}}>
              {allUsers.map(u => {
                const log = attendanceLogs.find(l => l.userId === u.id)
                const clockIn = log ? new Date(log.clockIn).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : null
                const clockOut = log?.clockOut ? new Date(log.clockOut).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : null
                const minutes = log?.totalMinutes || (log && !log.clockOut ? Math.round((Date.now() - new Date(log.clockIn)) / 60000) : null)
                const hours = minutes ? `${Math.floor(minutes/60)}h ${minutes%60}m` : null
                return (
                  <div key={u.id} style={{padding:'8px 12px',borderBottom:'0.5px solid #D3D1C7'}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:u.avatarColor,color:u.avatarTextColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:500,flexShrink:0}}>
                        {u.displayName.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{fontSize:11,fontWeight:500,color:'#2C2C2A',flex:1}}>{u.displayName}</span>
                      <span style={{fontSize:9,padding:'1px 6px',borderRadius:20,background:u.status==='ONLINE'?'#EAF3DE':'#F1EFE8',color:u.status==='ONLINE'?'#27500A':'#888780',fontWeight:500}}>{u.status?.toLowerCase()}</span>
                    </div>
                    {log ? (
                      <div style={{fontSize:10,color:'#888780',paddingLeft:31,display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span>in: <b style={{color:'#2C2C2A'}}>{clockIn}</b></span>
                        {clockOut && <span>out: <b style={{color:'#2C2C2A'}}>{clockOut}</b></span>}
                        {hours && <span>total: <b style={{color:'#085041'}}>{hours}</b></span>}
                        {!clockOut && <span style={{color:'#639922',fontWeight:500}}>● active</span>}
                      </div>
                    ) : (
                      <div style={{fontSize:10,color:'#888780',paddingLeft:31}}>not clocked in today</div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{padding:'8px 12px',borderTop:'0.5px solid #D3D1C7',fontSize:10,color:'#888780',display:'flex',justifyContent:'space-between'}}>
              <span>{allUsers.filter(u=>u.status==='ONLINE').length} online now</span>
              <span>{attendanceLogs.length} clocked in today</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
