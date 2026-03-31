export const ROLE_PERMISSIONS = {
  Admin: {
    canView: ['dashboard', 'finance', 'procurement', 'inventory', 'production', 'sales', 'reports', 'users', 'audit', 'settings'],
    canEdit: ['*'],
  },
  'Finance Manager': {
    canView: ['dashboard', 'finance', 'reports', 'audit'],
    canEdit: ['finance'],
  },
  'Procurement Officer': {
    canView: ['dashboard', 'procurement', 'inventory', 'reports', 'audit'],
    canEdit: ['procurement'],
  },
  'Inventory Manager': {
    canView: ['dashboard', 'inventory', 'production', 'reports', 'audit'],
    canEdit: ['inventory'],
  },
  'Production Manager': {
    canView: ['dashboard', 'production', 'inventory', 'reports', 'audit'],
    canEdit: ['production'],
  },
  'Sales Manager': {
    canView: ['dashboard', 'sales', 'reports', 'audit'],
    canEdit: ['sales'],
  },
  Viewer: {
    canView: ['dashboard', 'finance', 'procurement', 'inventory', 'production', 'sales', 'reports', 'audit'],
    canEdit: [],
  },
  'Operations Manager': {
    canView: ['dashboard', 'procurement', 'inventory', 'production', 'sales', 'reports', 'audit'],
    canEdit: ['procurement', 'production', 'inventory', 'sales'],
  },
}

export function canViewModule(role, moduleKey) {
  const def = ROLE_PERMISSIONS[role]
  if (!def) return false
  return def.canView.includes(moduleKey)
}

export function canEditModule(role, moduleKey) {
  const def = ROLE_PERMISSIONS[role]
  if (!def) return false
  if (def.canEdit.includes('*')) return true
  return def.canEdit.includes(moduleKey)
}

export function isViewer(role) {
  return role === 'Viewer'
}

export function calculateEfficiency(actual, planned) {
  if (!planned) return 0
  return Math.max(0, Math.min(200, (actual / planned) * 100))
}

export function generateForecast(history) {
  if (!history || history.length === 0) {
    return { next: 0, trend: 'flat' }
  }
  const windowSize = Math.min(3, history.length)
  const recent = history.slice(-windowSize)
  const avg =
    recent.reduce((sum, v) => sum + v, 0) / (recent.length || 1)
  const first = recent[0]
  const last = recent[recent.length - 1]
  let trend = 'flat'
  if (last > first * 1.05) trend = 'up'
  else if (last < first * 0.95) trend = 'down'
  return { next: Math.round(avg), trend }
}

