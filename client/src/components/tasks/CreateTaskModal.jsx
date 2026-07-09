import { useState } from 'react'
import { useTaskStore } from '../../store/taskStore'

export default function CreateTaskModal({ onClose }) {
  const { createTask } = useTaskStore()
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    visibility: 'ASSIGNEES',
    dueDate: '',
    estimateMin: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    setSubmitting(true)
    const res = await createTask({
      ...form,
      estimateMin: form.estimateMin ? parseInt(form.estimateMin) : null,
      dueDate: form.dueDate || null,
    })
    setSubmitting(false)
    if (res.success) onClose()
    else setError(res.error || 'Failed to create task')
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:12,padding:'1.5rem',width:380,maxWidth:'90vw',boxShadow:'0 8px 32px rgba(0,0,0,0.15)'}}>
        <div style={{fontSize:14,fontWeight:500,color:'#2C2C2A',marginBottom:16}}>new task</div>
        <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <div style={{fontSize:11,color:'#888780',marginBottom:3}}>title *</div>
            <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
              placeholder="task title" autoFocus
              style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none'}} />
          </div>
          <div>
            <div style={{fontSize:11,color:'#888780',marginBottom:3}}>description</div>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
              placeholder="optional description" rows={2}
              style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none',resize:'vertical'}} />
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#888780',marginBottom:3}}>priority</div>
              <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))}
                style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',background:'#fff'}}>
                <option value="LOW">low</option>
                <option value="MEDIUM">medium</option>
                <option value="HIGH">high</option>
                <option value="URGENT">urgent</option>
              </select>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#888780',marginBottom:3}}>visibility</div>
              <select value={form.visibility} onChange={e => setForm(f=>({...f,visibility:e.target.value}))}
                style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit',background:'#fff'}}>
                <option value="PRIVATE">private</option>
                <option value="ASSIGNEES">assignees</option>
                <option value="TEAM">team</option>
                <option value="PUBLIC">public</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#888780',marginBottom:3}}>due date</div>
              <input type="date" value={form.dueDate} onChange={e => setForm(f=>({...f,dueDate:e.target.value}))}
                style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit'}} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#888780',marginBottom:3}}>estimate (minutes)</div>
              <input type="number" value={form.estimateMin} onChange={e => setForm(f=>({...f,estimateMin:e.target.value}))}
                placeholder="e.g. 60"
                style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:7,border:'0.5px solid #D3D1C7',fontFamily:'inherit'}} />
            </div>
          </div>
          {error && <div style={{fontSize:11,color:'#A32D2D',background:'#FCEBEB',padding:'6px 10px',borderRadius:6}}>{error}</div>}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button type="button" onClick={onClose}
              style={{flex:1,padding:'8px',borderRadius:8,border:'0.5px solid #D3D1C7',background:'transparent',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#534AB7',color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
              {submitting ? 'creating...' : 'create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}