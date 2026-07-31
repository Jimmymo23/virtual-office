import { useState, useEffect } from 'react'
import api from '../../api'

export default function OfficesPanel() {
  const [offices, setOffices] = useState([])
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchOffices = async () => {
    try {
      const res = await api.get('/admin/offices')
      setOffices(res.data.offices)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchOffices() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/admin/offices', { name: name.trim() })
      setName('')
      fetchOffices()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create office')
    }
    setSubmitting(false)
  }

  const handleDelete = async (office) => {
    if (office._count?.users > 0) {
      alert(`Cannot delete "${office.name}" — it still has ${office._count.users} user(s). Remove or reassign them first.`)
      return
    }
    if (!window.confirm(`Delete office "${office.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`/admin/offices/${office.id}`)
      fetchOffices()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete office')
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <form onSubmit={handleCreate} style={{padding:'8px 12px',borderBottom:'0.5px solid #D3D1C7',display:'flex',gap:6}}>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="New office name..."
          style={{flex:1,fontSize:12,padding:'5px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none'}} />
        <button type="submit" disabled={submitting}
          style={{fontSize:11,padding:'5px 10px',borderRadius:6,border:'none',background:'#534AB7',color:'#fff',cursor:'pointer'}}>
          {submitting ? '...' : '+ Create'}
        </button>
      </form>
      {error && <div style={{padding:'6px 12px',fontSize:12,color:'#A32D2D',background:'#FCEBEB'}}>{error}</div>}
      <div style={{flex:1,overflowY:'auto'}}>
        {offices.map(o => (
          <div key={o.id} style={{padding:'8px 12px',borderBottom:'0.5px solid #D3D1C7',display:'flex',alignItems:'center',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:500,color:'#2C2C2A'}}>{o.name}</div>
              <div style={{fontSize:11,color:'#888780'}}>/{o.slug}</div>
            </div>
            <span style={{fontSize:10,padding:'1px 8px',borderRadius:20,background:'#F1EFE8',color:'#534AB7'}}>
              {o._count?.users ?? 0} users
            </span>
            <button onClick={() => handleDelete(o)}
              style={{fontSize:10,padding:'3px 8px',borderRadius:6,border:'0.5px solid #F09595',background:'#FCEBEB',color:'#A32D2D',cursor:'pointer'}}>
              delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
