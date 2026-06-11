import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { adminLogin } from '../../lib/api'
import './AdminLogin.css'

const WAKE_SECONDS = 35

export default function AdminLogin({ onSuccess }) {
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState(null)
  const [status,    setStatus]    = useState('idle') // idle | loading | waking
  const [countdown, setCountdown] = useState(0)
  const intervalRef = useRef(null)
  const savedPwd    = useRef('')

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const doLogin = useCallback(async (pwd) => {
    setError(null)
    setStatus('loading')
    try {
      const { access_token } = await adminLogin(pwd)
      localStorage.setItem('admin_token', access_token)
      onSuccess()
    } catch (err) {
      const isSleeping =
        err.name === 'AbortError' ||
        err.message === 'Failed to fetch' ||
        err.message === 'Load failed' ||
        err.message?.toLowerCase().includes('network')

      if (isSleeping) {
        setStatus('waking')
        setCountdown(WAKE_SECONDS)
        intervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(intervalRef.current)
              doLogin(savedPwd.current)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(err.message)
        setStatus('idle')
      }
    }
  }, [onSuccess])

  const handleSubmit = (e) => {
    e.preventDefault()
    clearInterval(intervalRef.current)
    savedPwd.current = password
    doLogin(password)
  }

  const busy = status !== 'idle'

  return (
    <div className="admin-login-wrap">
      <motion.div
        className="admin-login-box"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="admin-login-header">
          <span className="mono admin-login-chapter">// /admin</span>
          <h2 className="display admin-login-title">Access</h2>
        </div>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="admin-login-input"
            autoFocus
            disabled={busy}
          />
          {status === 'waking' && (
            <div className="admin-login-waking mono">
              Backend waking up — retrying in {countdown}s…
            </div>
          )}
          {error && <div className="admin-login-error mono">{error}</div>}
          <button type="submit" className="btn btn-yellow admin-login-btn" disabled={busy}>
            {status === 'waking'  ? `Waking up… ${countdown}s`
              : status === 'loading' ? 'Checking…'
              : 'Enter the archive →'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
