opendimport axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vo_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vo_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}
export const tasksApi = {
  getAll: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  createSubTask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
  startTimer: (id) => api.post(`/tasks/${id}/timer/start`),
  stopTimer: (id, note) => api.post(`/tasks/${id}/timer/stop`, { note }),
  getComments: (id) => api.get(`/tasks/${id}/comments`),
  addComment: (id, body) => api.post(`/tasks/${id}/comments`, { body }),
}
export default api
