import { useState } from 'react'
import { motion } from 'framer-motion'
import { adminLogin } from '../../lib/api'
import './AdminLogin.css'

export default function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { access_token } = await adminLogin(password)
      localStorage.setItem('admin_token', access_token)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
            onChange={(e) => setPassword(e.target.value)}
            className="admin-login-input"
            autoFocus
          />
          {error && <div className="admin-login-error mono">{error}</div>}
          <button type="submit" className="btn btn-yellow admin-login-btn" disabled={loading}>
            {loading ? 'Checking...' : 'Enter the archive →'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
