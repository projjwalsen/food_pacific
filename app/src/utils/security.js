import { auditLogs as initialAuditLogs } from '../data/dummyData'

export function logSecurityEvent(action, details, user) {
  try {
    const entry = {
      id: `sec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user?.name ?? 'System',
      role: user?.role ?? 'System',
      module: 'Security',
      action,
      details,
      severity: action === 'Failed Login' ? 'Warning' : 'Info',
    }

    const raw = window.localStorage.getItem('foods-pacific-erp-state')
    const state = raw ? JSON.parse(raw) : { auditLogs: initialAuditLogs }
    const logs = Array.isArray(state.auditLogs) ? state.auditLogs : initialAuditLogs

    const nextLogs = [entry, ...logs].slice(0, 200)
    const nextState = { ...state, auditLogs: nextLogs }
    window.localStorage.setItem('foods-pacific-erp-state', JSON.stringify(nextState))
  } catch (e) {
    void e
  }
}
