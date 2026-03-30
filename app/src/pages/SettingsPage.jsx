import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'

export function SettingsPage() {
  const { settings, updateSettings } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState(settings)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  function handleChange(path, value) {
    setForm((prev) => {
      const copy = { ...prev }
      const parts = path.split('.')
      let target = copy
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i]
        target[key] = { ...(target[key] ?? {}) }
        target = target[key]
      }
      target[parts[parts.length - 1]] = value
      return copy
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    updateSettings(form, currentUser)
    showToast('Settings saved for Foods Pacific ERP.', 'success')
  }

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Manage company profile, notification defaults, and security posture."
      />

      <form className="settings-grid" onSubmit={handleSubmit}>
        <section className="card">
          <div className="card-header">
            <h3>Company profile</h3>
            <span className="card-subtitle">Master data for Foods Pacific ERP</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Legal name</span>
              <input
                type="text"
                className="input"
                value={form.company.legalName}
                onChange={(e) => handleChange('company.legalName', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Registration number</span>
              <input
                type="text"
                className="input"
                value={form.company.registrationNumber}
                onChange={(e) => handleChange('company.registrationNumber', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Base currency</span>
              <select
                className="input input-select"
                value={form.company.baseCurrency}
                onChange={(e) => handleChange('company.baseCurrency', e.target.value)}
              >
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Fiscal year start</span>
              <select
                className="input input-select"
                value={form.company.fiscalYearStartMonth}
                onChange={(e) => handleChange('company.fiscalYearStartMonth', e.target.value)}
              >
                <option value="January">January</option>
                <option value="April">April</option>
                <option value="July">July</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Notification preferences</h3>
            <span className="card-subtitle">What the ERP should surface proactively</span>
          </div>
          <div className="settings-toggle-list">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.notifications.emailNotifications}
                onChange={(e) =>
                  handleChange('notifications.emailNotifications', e.target.checked)
                }
              />
              <span>Email notifications</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.notifications.inAppNotifications}
                onChange={(e) =>
                  handleChange('notifications.inAppNotifications', e.target.checked)
                }
              />
              <span>In-app notifications</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.notifications.approvals}
                onChange={(e) => handleChange('notifications.approvals', e.target.checked)}
              />
              <span>Approvals and escalations</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.notifications.inventoryAlerts}
                onChange={(e) =>
                  handleChange('notifications.inventoryAlerts', e.target.checked)
                }
              />
              <span>Inventory alerts</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.notifications.securityAlerts}
                onChange={(e) =>
                  handleChange('notifications.securityAlerts', e.target.checked)
                }
              />
              <span>Security alerts</span>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>ERP preferences</h3>
            <span className="card-subtitle">How the workspace should feel</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Theme</span>
              <select
                className="input input-select"
                value={form.preferences.theme}
                onChange={(e) => handleChange('preferences.theme', e.target.value)}
              >
                <option value="light">Light</option>
                <option value="system">Match system</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Density</span>
              <select
                className="input input-select"
                value={form.preferences.density}
                onChange={(e) => handleChange('preferences.density', e.target.value)}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Date format</span>
              <select
                className="input input-select"
                value={form.preferences.dateFormat}
                onChange={(e) => handleChange('preferences.dateFormat', e.target.value)}
              >
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.preferences.enableAutoSave}
                onChange={(e) =>
                  handleChange('preferences.enableAutoSave', e.target.checked)
                }
              />
              <span>Auto-save work-in-progress forms</span>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Security</h3>
            <span className="card-subtitle">Guardrails for ERP access</span>
          </div>
          <div className="settings-toggle-list">
            <label className="field">
              <span className="field-label">Session timeout (minutes)</span>
              <input
                type="number"
                className="input"
                value={form.security.sessionTimeoutMinutes}
                onChange={(e) =>
                  handleChange('security.sessionTimeoutMinutes', Number(e.target.value || 0))
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.security.mfaEnabled}
                onChange={(e) => handleChange('security.mfaEnabled', e.target.checked)}
              />
              <span>Require multi-factor authentication</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.security.loginAlerts}
                onChange={(e) => handleChange('security.loginAlerts', e.target.checked)}
              />
              <span>Send login alerts</span>
            </label>
          </div>

          <div className="settings-profile">
            <h4>Current profile</h4>
            <p>
              Signed in as <strong>{currentUser?.name}</strong> ({currentUser?.role}). Changes
              apply at a company level in this demo environment.
            </p>
          </div>
        </section>

        <div className="settings-actions">
          <button type="submit" className="button primary">
            Save settings
          </button>
        </div>
      </form>
    </div>
  )
}

