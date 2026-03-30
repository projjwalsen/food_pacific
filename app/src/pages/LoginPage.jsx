import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [email, setEmail] = useState('admin@foodspacific.com')
  const [password, setPassword] = useState('123456')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const session = window.localStorage.getItem('foods-pacific-erp-session')
    if (session) {
      navigate('/dashboard')
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = login(email.trim(), password)
    setSubmitting(false)

    if (!result.success) {
      setError(result.message)
      showToast(result.message, 'error')
      return
    }

    showToast(`Welcome back, ${result.user.name}`, 'success')
    navigate('/dashboard')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-main">
          <div className="login-brand">
            <div className="login-logo">FP</div>
            <div>
              <div className="login-brand-title">Foods Pacific ERP</div>
              <div className="login-brand-subtitle">Premium manufacturing cloud suite</div>
            </div>
          </div>

          <h1 className="login-title">Sign in</h1>
          <p className="login-subtitle">
            Use your Foods Pacific ERP credentials to access finance, production, and supply chain
            in one place.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="login-options">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  showToast('Password reset is not enabled in this demo environment.', 'info')
                }
              >
                Forgot password?
              </button>
            </div>

            {error ? <div className="form-error">{error}</div> : null}

            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="login-help">
              <div className="login-help-title">Demo credentials</div>
              <ul>
                <li>
                  Admin: <strong>admin@foodspacific.com</strong> / <strong>123456</strong>
                </li>
                <li>
                  Operations Manager: <strong>manager@foodspacific.com</strong> /{' '}
                  <strong>123456</strong>
                </li>
                <li>
                  Viewer: <strong>viewer@foodspacific.com</strong> / <strong>123456</strong>
                </li>
              </ul>
            </div>
          </form>
        </div>

        <aside className="login-aside">
          <h2>Built for modern food manufacturers</h2>
          <p>
            Monitor plant performance, orchestrate procurement, and keep finance aligned with
            production in real time.
          </p>
          <ul className="login-aside-list">
            <li>End-to-end batch traceability from raw material to finished goods.</li>
            <li>Scenario planning for seasonal demand and promotional lifts.</li>
            <li>Configurable approvals for purchasing, price lists, and credit limits.</li>
            <li>Role-based workspaces for production, inventory, and finance teams.</li>
          </ul>
          <div className="login-aside-footer">
            Live snapshot for Foods Pacific demo environment.
          </div>
        </aside>
      </div>
    </div>
  )
}
