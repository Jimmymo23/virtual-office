import { useState, useEffect } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useAuthStore } from '../../store/authStore'
import { tasksApi } from '../../api'

const STATUS_OPTIONS = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ARCHIVED']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const PRIORITY_COLORS = { LOW: '#639922', MEDIUM: '#BA7517', HIGH: '#E24B4A', URGENT: '#A32D2D' }

export default function TaskDetail({ task, onBack }) {
  const user = useAuthStore(s => s.user)
  const { updateTask, createSubTask, startTimer, stopTimer, activeTimer } = useTaskStore()
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [newSubTask, setNewSubTask] = useState('')
  const [showSubTaskInput, setShowSubTaskInput] = useState(false)

  useEffect(() => {
    tasksApi.getComments(task.id).then(res => setComments(res.data.comments)).catch(() => {})
  }, [task.id])

  const handleStatus = async (status) => {
    await updateTask(task.id, { status })
    task.status = status
  }

  const handleAddComment = async () => {
    if (!commentInput.trim()) return
    const res = await tasksApi.addComment(task.id, commentInput.trim())
    setComments(c => [...c, res.data.comment])
    setCommentInput('')
  }

  const handleAddSubTask = async () => {
    if (!newSubTask.trim()) return
    await createSubTask(task.id, { title: newSubTask.trim() })
    setNewSubTask('')
    setShowSubTaskInput(false)
  }

  const isTimerActive = activeTimer?.taskId === task.id

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'8px 12px',borderBottom:'0.5px solid #D3D1C7',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#888780',padding:0}}>←</button>
        <div style={{flex:1,fontSize:12,fontWeight:500,color:'#2C2C2A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.title}</div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'10px 12px',display:'flex',flexDirection:'column',gap:10}}>

        {/* Status + Priority */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <select defaultValue={task.status} onChange={e => handleStatus(e.target.value)}
            style={{fontSize:10,padding:'3px 7px',borderRadius:20,border:'0.5px solid #D3D1C7',background:'#F1EFE8',color:'#2C2C2A',cursor:'pointer',fontFamily:'inherit'}}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toLowerCase().replace('_',' ')}</option>)}
          </select>
          <select defaultValue={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value })}
            style={{fontSize:10,padding:'3px 7px',borderRadius:20,border:'0.5px solid #D3D1C7',background:'#F1EFE8',color:PRIORITY_COLORS[task.priority],cursor:'pointer',fontFamily:'inherit'}}>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.toLowerCase()}</option>)}
          </select>
        </div>

        {/* Description */}
        {task.description && (
          <div style={{fontSize:11,color:'#5F5E5A',lineHeight:1.5}}>{task.description}</div>
        )}

        {/* Timer */}
        <div style={{background:'#F1EFE8',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'#5F5E5A',flex:1}}>
            {task.estimateMin ? `estimate: ${Math.floor(task.estimateMin/60)}h ${task.estimateMin%60}m` : 'no estimate'}
          </span>
          {isTimerActive ? (
            <button onClick={() => stopTimer(task.id)} style={{fontSize:10,padding:'3px 10px',borderRadius:20,border:'none',background:'#A32D2D',color:'#fff',cursor:'pointer'}}>⏹ stop</button>
          ) : (
            <button onClick={() => startTimer(task.id)} style={{fontSize:10,padding:'3px 10px',borderRadius:20,border:'none',background:'#085041',color:'#fff',cursor:'pointer'}}>▶ start timer</button>
          )}
        </div>

        {/* Assignees */}
        <div>
          <div style={{fontSize:9,letterSpacing:1,color:'#888780',textTransform:'uppercase',marginBottom:5}}>assignees</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {task.assignees?.map(a => (
              <div key={a.userId} style={{display:'flex',alignItems:'center',gap:4,background:'#F1EFE8',borderRadius:20,padding:'2px 8px 2px 4px'}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:a.user?.avatarColor,color:a.user?.avatarTextColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:500}}>
                  {a.user?.displayName?.slice(0,2).toUpperCase()}
                </div>
                <span style={{fontSize:10,color:'#2C2C2A'}}>{a.user?.displayName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-tasks */}
        <div>
          <div style={{fontSize:9,letterSpacing:1,color:'#888780',textTransform:'uppercase',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>sub-tasks ({task.subTasks?.filter(s=>s.status==='DONE').length||0}/{task.subTasks?.length||0})</span>
            <span onClick={() => setShowSubTaskInput(true)} style={{cursor:'pointer',color:'#534AB7',fontSize:10}}>+ add</span>
          </div>
          {task.subTasks?.map(s => (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:7,padding:'4px 0',borderBottom:'0.5px solid #F1EFE8'}}>
              <input type="checkbox" checked={s.status==='DONE'} onChange={e => updateTask(s.id, { status: e.target.checked ? 'DONE' : 'IN_PROGRESS' })} style={{cursor:'pointer'}} />
              <span style={{fontSize:11,color:s.status==='DONE'?'#888780':'#2C2C2A',textDecoration:s.status==='DONE'?'line-through':'none',flex:1}}>{s.title}</span>
            </div>
          ))}
          {showSubTaskInput && (
            <div style={{display:'flex',gap:5,marginTop:6}}>
              <input value={newSubTask} onChange={e => setNewSubTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubTask()}
                placeholder="sub-task title..." autoFocus
                style={{flex:1,fontSize:11,padding:'4px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none'}} />
              <button onClick={handleAddSubTask} style={{fontSize:10,padding:'4px 8px',borderRadius:6,border:'none',background:'#534AB7',color:'#fff',cursor:'pointer'}}>add</button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <div style={{fontSize:9,letterSpacing:1,color:'#888780',textTransform:'uppercase',marginBottom:5}}>comments ({comments.length})</div>
          {comments.map(c => (
            <div key={c.id} style={{display:'flex',gap:7,marginBottom:8}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:c.sender?.avatarColor,color:c.sender?.avatarTextColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:500,flexShrink:0}}>
                {c.sender?.displayName?.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:500,color:'#2C2C2A'}}>{c.sender?.displayName} <span style={{color:'#888780',fontWeight:400}}>{new Date(c.sentAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
                <div style={{fontSize:11,color:'#5F5E5A',marginTop:1,lineHeight:1.4}}>{c.body}</div>
              </div>
            </div>
          ))}
          <div style={{display:'flex',gap:5,marginTop:4}}>
            <input value={commentInput} onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="add a comment..."
              style={{flex:1,fontSize:11,padding:'5px 8px',borderRadius:6,border:'0.5px solid #D3D1C7',fontFamily:'inherit',outline:'none'}} />
            <button onClick={handleAddComment} style={{fontSize:10,padding:'5px 8px',borderRadius:6,border:'none',background:'#534AB7',color:'#fff',cursor:'pointer'}}>send</button>
          </div>
        </div>
      </div>
    </div>
  )
}