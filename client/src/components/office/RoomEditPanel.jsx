import { useState } from 'react'
import api from '../../api'

export default function RoomEditPanel({ room, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: room.name,
    voiceMode: room.voiceMode,
    hasVideo: room.hasVideo,
    isLockable: room.isLockable,
    guestAccessible: room.guestAccessible,
    zoneX: room.zoneX,
    zoneY: room.zoneY,
    zoneW: room.zoneW,
    zoneH: room.zoneH,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.patch(`/rooms/${room.id}`, form)
      onSaved(res.data.room)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete room "${room.name}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      await api.delete(`/rooms/${room.id}`)
      onDeleted(room.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete')
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:12,padding:'1.5rem',width:380,maxWidth:'90vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.15)'}}>
        <div style={{fontSize:14,fontWeight:500,color:'#2C2C2A',marginBottom:16}}>edit room</div>
        <form onSubmit={handleSave} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <div style={{fontSize:11,color:'#888780',marginBottom:3}}>name</div>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none'}} />
          </div>

          <div>
            <div style={{fontSize:11,color:'#888780',marginBottom:3}}>voice mode</div>
            <select value={form.voiceMode} onChange={e => setForm(f => ({...f, voiceMode: e.target.value}))}
              style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',background:'#fff'}}>
              <option value="MUTED">muted (no voice)</option>
              <option value="ALWAYS_ON">always on</option>
              <option value="PUSH_TO_TALK">push to talk</option>
            </select>
          </div>

          <div style={{display:'flex',gap:14}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#2C2C2A',cursor:'pointer'}}>
              <input type="checkbox" checked={form.hasVideo} onChange={e => setForm(f => ({...f, hasVideo: e.target.checked}))} />
              video calls
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#2C2C2A',cursor:'pointer'}}>
              <input type="checkbox" checked={form.isLockable} onChange={e => setForm(f => ({...f, isLockable: e.target.checked}))} />
              lockable
            </label>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#2C2C2A',cursor:'pointer'}}>
            <input type="checkbox" checked={form.guestAccessible} onChange={e => setForm(f => ({...f, guestAccessible: e.target.checked}))} />
            guest accessible
          </label>

          <div style={{fontSize:11,color:'#888780',marginTop:4}}>position &amp; size (grid tiles)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div>
              <div style={{fontSize:10,color:'#888780',marginBottom:2}}>X</div>
              <input type="number" value={form.zoneX} onChange={e => setForm(f => ({...f, zoneX: parseInt(e.target.value) || 0}))}
                style={{width:'100%',fontSize:12,padding:'6px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit'}} />
            </div>
            <div>
              <div style={{fontSize:10,color:'#888780',marginBottom:2}}>Y</div>
              <input type="number" value={form.zoneY} onChange={e => setForm(f => ({...f, zoneY: parseInt(e.target.value) || 0}))}
                style={{width:'100%',fontSize:12,padding:'6px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit'}} />
            </div>
            <div>
              <div style={{fontSize:10,color:'#888780',marginBottom:2}}>width</div>
              <input type="number" value={form.zoneW} onChange={e => setForm(f => ({...f, zoneW: parseInt(e.target.value) || 1}))}
                style={{width:'100%',fontSize:12,padding:'6px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit'}} />
            </div>
            <div>
              <div style={{fontSize:10,color:'#888780',marginBottom:2}}>height</div>
              <input type="number" value={form.zoneH} onChange={e => setForm(f => ({...f, zoneH: parseInt(e.target.value) || 1}))}
                style={{width:'100%',fontSize:12,padding:'6px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit'}} />
            </div>
          </div>

          {error && <div style={{fontSize:11,color:'#A32D2D',background:'#FCEBEB',padding:'6px 10px',borderRadius:6}}>{error}</div>}

          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button type="button" onClick={onClose}
              style={{flex:1,padding:'8px',borderRadius:8,border:'0.5px solid #D3D1C7',background:'transparent',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              cancel
            </button>
            <button type="submit" disabled={saving}
              style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#534AB7',color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              {saving ? 'saving...' : 'save'}
            </button>
          </div>
          <button type="button" onClick={handleDelete} disabled={saving}
            style={{padding:'6px',borderRadius:8,border:'0.5px solid #F09595',background:'#FCEBEB',color:'#A32D2D',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
            delete room
          </button>
        </form>
      </div>
    </div>
  )
}
