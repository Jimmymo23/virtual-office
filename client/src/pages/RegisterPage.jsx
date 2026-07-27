import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import AvatarPicker from '../components/avatars/AvatarPicker'
import styles from './Auth.module.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirm: '' })
  const [avatarId, setAvatarId] = useState('avatar1')
  const [offices, setOffices] = useState([])
  const [officeId, setOfficeId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    axios.get(`${API}/auth/offices`)
      .then(res => setOffices(res.data.offices))
      .catch(() => {})
  }, [])

  const handle = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return setFormError('Passwords do not match')
    if (!officeId) return setFormError('Please select an office')
    setFormError('')
    setSubmitting(true)
    try {
      await axios.post(`${API}/auth/register`, {
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        avatarId,
        officeId,
      })
      setPending(true)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Registration failed')
    }
    setSubmitting(false)
  }

  if (pending) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>⏳</div>
          <h1 className={styles.title}>request sent</h1>
          <p className={styles.sub}>
            Your account is waiting for admin approval.<br/>
            You'll be able to log in once approved.
          </p>
          <Link to="/login" className={styles.btn} style={{display:'block',textDecoration:'none',textAlign:'center',marginTop:16}}>
            back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{maxWidth:440}}>
        <div className={styles.logo}>🏢</div>
        <h1 className={styles.title}>join an office</h1>
        <p className={styles.sub}>request access to your virtual office</p>
        <form onSubmit={handle} className={styles.form}>
          <label className={styles.label}>office</label>
          <select className={styles.input} value={officeId} onChange={e => setOfficeId(e.target.value)} required
            style={{background:'#fff'}}>
            <option value="">select your office...</option>
            {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <label className={styles.label}>display name</label>
          <input className={styles.input} value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Ahmed Hassan" required />
          <label className={styles.label}>username</label>
          <input className={styles.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="ahmed.hassan" required />
          <label className={styles.label}>password</label>
          <input className={styles.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
          <label className={styles.label}>confirm password</label>
          <input className={styles.input} type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" required />
          <div style={{marginTop:8}}>
            <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
          </div>
          {formError && <p className={styles.error}>{formError}</p>}
          <button className={styles.btn} disabled={submitting}>{submitting ? 'sending request...' : 'request to join'}</button>
        </form>
        <p className={styles.footer}>have an account? <Link to="/login">sign in</Link></p>
      </div>
    </div>
  )
}
