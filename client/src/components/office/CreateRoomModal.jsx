import { useState } from 'react'
import api from '../../api'

export default function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [voiceMode, setVoiceMode] = useState('MUTED')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Room name required')
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/rooms', {
        name: name.trim(),
        voiceMode,
        zoneX: 2, zoneY: 2, zoneW: 5, zoneH: 5,
        color: '#E1F5EE',
      })
      onCreated(res.data.room)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
    }
    setSubmitting(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:12,padding:'1.5rem',width:340,maxWidth:'90vw',boxShadow:'0 8px 32px rgba(0,0,0,0.15)'}}>
        <div style={{fontSize:14,fontWeight:500,color:'#2C2C2A',marginBottom:16}}>new room</div>
        <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <div style={{fontSize:11,color:'#888780',marginBottom:3}}>name</div>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus
              placeholder="e.g. lounge"
              style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none'}} />
          </div>
          <div>
            <div style={{fontSize:11,color:'#888780',marginBottom:3}}>voice mode</div>
            <select value={voiceMode} onChange={e => setVoiceMode(e.target.value)}
              style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',background:'#fff'}}>
              <option value="MUTED">muted (no voice)</option>
              <option value="ALWAYS_ON">always on</option>
              <option value="PUSH_TO_TALK">push to talk</option>
            </select>
          </div>
          <div style={{fontSize:10,color:'#888780'}}>
            new rooms start at position (2,2), size 5×5 — you can edit position after creating.
          </div>
          {error && <div style={{fontSize:11,color:'#A32D2D',background:'#FCEBEB',padding:'6px 10px',borderRadius:6}}>{error}</div>}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button type="button" onClick={onClose}
              style={{flex:1,padding:'8px',borderRadius:8,border:'0.5px solid #D3D1C7',background:'transparent',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#534AB7',color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              {submitting ? 'creating...' : 'create room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
