import { create } from 'zustand'
import { tasksApi } from '../api'

export const useTaskStore = create((set, get) => ({
  tasks: [],
  activeTask: null,
  activeTimer: null,
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const res = await tasksApi.getAll()
      set({ tasks: res.data.tasks, loading: false })
    } catch (err) {
      console.error(err)
      set({ loading: false })
    }
  },

  createTask: async (data) => {
    try {
      const res = await tasksApi.create(data)
      set(state => ({ tasks: [res.data.task, ...state.tasks] }))
      return { success: true, task: res.data.task }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to create task' }
    }
  },
updateTask: async (id, data) => {
  try {
    const res = await tasksApi.update(id, data)
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...res.data.task } : t)
    }))
    return { success: true, task: res.data.task }
  } catch (err) {
    return { success: false }
  }
},

  createSubTask: async (taskId, data) => {
    try {
      const res = await tasksApi.createSubTask(taskId, data)
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId
          ? { ...t, subTasks: [...(t.subTasks || []), res.data.subTask] }
          : t
        )
      }))
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  },

  startTimer: async (taskId) => {
    try {
      const res = await tasksApi.startTimer(taskId)
      set({ activeTimer: { taskId, logId: res.data.log.id, startedAt: res.data.log.startedAt } })
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  },

  stopTimer: async (taskId, note) => {
    try {
      await tasksApi.stopTimer(taskId, note)
      set({ activeTimer: null })
      get().fetchTasks()
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  },

  setActiveTask: (task) => set({ activeTask: task }),
}))