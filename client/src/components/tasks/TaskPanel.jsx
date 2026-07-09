import { useState, useEffect } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useAuthStore } from '../../store/authStore'
import TaskDetail from './TaskDetail'
import CreateTaskModal from './CreateTaskModal'

const PRIORITY_COLORS = {
  LOW: '#639922', MEDIUM: '#BA7517', HIGH: '#E24B4A', URGENT: '#A32D2D'
}
const STATUS_COLORS = {
  BACKLOG: '#888780', IN_PROGRESS: '#185FA5', IN_REVIEW: '#534AB7', DONE: '#27500A', ARCHIVED: '#B4B2A9'
}
const STATUS_LABELS = {
  BACKLOG: 'backlog', IN_PROGRESS: 'in progress', IN_REVIEW: 'in review', DONE: 'done', ARCHIVED: 'archived'
}

export default function TaskPanel() {
  const user = useAuthStore(s => s.user)
  const { tasks, loading, fetchTasks, activeTask, setActiveTask, activeTimer, startTimer, stopTimer } = useTaskStore()
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('mine')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => { fetchTasks() }, [])

  useEffect(() => {
    if (!activeTimer) return
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeTimer.startedAt)) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [activeTimer])

  const filteredTasks = tasks.filter(t => {
    if (filter === 'mine') return t.assignees?.some(a => a.userId === user?.id)
    if (filter === 'created') return t.creatorId === user?.id
    return true
  })

  const formatElapsed = (s) => `${Math.floor(s/3600)}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  if (activeTask) return <TaskDetail task={activeTask} onBack={() => setActiveTask(null)} />

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'8px 12px',borderBottom:'0.5px solid #D3D1C7',display:'flex',gap:6,flexWrap:'wrap'}}>
        {['mine','created','all'].map(f => (
          <span key={f} onClick={() => setFilter(f)} style={{fontSize:10,padding:'2px 8px',borderRadius:20,cursor:'pointer',background:filter===f?'#EEEDFE':'#F1EFE8',color:filter===f?'#534AB7':'#888780',fontWeight:filter===f?500:400}}>
            {f === 'mine' ? 'assigned to me' : f === 'created' ? 'created by me' : 'all'}
          </span>
        ))}
      </div>

      {activeTimer && (
        <div style={{padding:'6px 12px',background:'#E1F5EE',borderBottom:'0.5px solid #9FE1CB',display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:10,color:'#085041'}}>⏱ {formatElapsed(elapsed)}</span>
          <span style={{fontSize:10,color:'#085041',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {tasks.find(t => t.id === activeTimer.taskId)?.title}
          </span>
          <button onClick={() => stopTimer(activeTimer.taskId)} style={{fontSize:9,padding:'2px 7px',borderRadius:20,border:'none',background:'#A32D2D',color:'#fff',cursor:'pointer'}}>stop</button>
        </div>
      )}

      <div style={{flex:1,overflowY:'auto'}}>
        {loading && <div style={{padding:'1rem',fontSize:11,color:'#888780',textAlign:'center'}}>loading...</div>}
        {!loading && filteredTasks.length === 0 && (
          <div style={{padding:'2rem 1rem',fontSize:11,color:'#888780',textAlign:'center'}}>no tasks yet</div>
        )}
        {filteredTasks.map(task => {
          const doneSubtasks = task.subTasks?.filter(s => s.status === 'DONE').length || 0
          const totalSubtasks = task.subTasks?.length || 0
          const isTimerActive = activeTimer?.taskId === task.id

          return (
            <div key={task.id} onClick={() => setActiveTask(task)}
              style={{padding:'8px 12px',borderBottom:'0.5px solid #D3D1C7',cursor:'pointer',borderLeft:`2px solid ${PRIORITY_COLORS[task.priority] || '#888780'}`}}
              onMouseEnter={e => e.currentTarget.style.background='#F1EFE8'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <div style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:3}}>
                <div style={{flex:1,fontSize:11,fontWeight:500,color:'#2C2C2A',lineHeight:1.3}}>{task.title}</div>
                <span style={{fontSize:9,padding:'1px 6px',borderRadius:20,background:'#F1EFE8',color:STATUS_COLORS[task.status],fontWeight:500,flexShrink:0}}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                {task.dueDate && (
                  <span style={{fontSize:9,color:new Date(task.dueDate) < new Date() ? '#A32D2D' : '#888780'}}>
                    due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {totalSubtasks > 0 && (
                  <span style={{fontSize:9,color:'#888780'}}>{doneSubtasks}/{totalSubtasks} subtasks</span>
                )}
                {isTimerActive && <span style={{fontSize:9,color:'#085041',fontWeight:500}}>● tracking</span>}
              </div>
              {totalSubtasks > 0 && (
                <div style={{height:3,background:'#F1EFE8',borderRadius:2,marginTop:4}}>
                  <div style={{height:3,background:'#639922',borderRadius:2,width:`${(doneSubtasks/totalSubtasks)*100}%`}} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{padding:'8px 12px',borderTop:'0.5px solid #D3D1C7'}}>
        <button onClick={() => setShowCreate(true)} style={{width:'100%',padding:'6px',borderRadius:8,border:'0.5px solid #D3D1C7',background:'transparent',color:'#2C2C2A',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
          + new task
        </button>
      </div>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}