import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OfficePage from './pages/OfficePage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888780' }}>loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  return user ? <Navigate to="/office" replace /> : children
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/office" element={<PrivateRoute><OfficePage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/office" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
