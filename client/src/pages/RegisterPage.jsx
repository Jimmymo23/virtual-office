import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import styles from './Auth.module.css'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const { register, error } = useAuthStore()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return setFormError('Passwords do not match')
    setFormError('')
    setSubmitting(true)
    const res = await register({ username: form.username, displayName: form.displayName, password: form.password })
    setSubmitting(false)
    if (res.success) navigate('/office')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🏢</div>
        <h1 className={styles.title}>create account</h1>
        <p className={styles.sub}>join your virtual office</p>
        <form onSubmit={handle} className={styles.form}>
          <label className={styles.label}>display name</label>
          <input className={styles.input} value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Ahmed Hassan" required />
          <label className={styles.label}>username</label>
          <input className={styles.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="ahmed.hassan" required />
          <label className={styles.label}>password</label>
          <input className={styles.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
          <label className={styles.label}>confirm password</label>
          <input className={styles.input} type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" required />
          {(formError || error) && <p className={styles.error}>{formError || error}</p>}
          <button className={styles.btn} disabled={submitting}>{submitting ? 'creating...' : 'create account'}</button>
        </form>
        <p className={styles.footer}>have an account? <Link to="/login">sign in</Link></p>
      </div>
    </div>
  )
}
