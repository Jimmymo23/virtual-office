import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import styles from './Auth.module.css'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const { login, error } = useAuthStore()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await login(form.username, form.password)
    setSubmitting(false)
    if (res.success) navigate('/office')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🏢</div>
        <h1 className={styles.title}>virtual office</h1>
        <p className={styles.sub}>sign in to enter the office</p>
        <form onSubmit={handle} className={styles.form}>
          <label className={styles.label}>username</label>
          <input
            className={styles.input}
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="your username"
            autoComplete="username"
            required
          />
          <label className={styles.label}>password</label>
          <input
            className={styles.input}
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btn} disabled={submitting}>
            {submitting ? 'signing in...' : 'enter office'}
          </button>
        </form>
        <p className={styles.footer}>
          no account? <Link to="/register">register</Link>
        </p>
      </div>
    </div>
  )
}
