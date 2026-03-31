import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canViewModule } from '../utils/permissions'

const PATH_MODULE_MAP = {
  '/dashboard': 'dashboard',
  '/finance': 'finance',
  '/procurement': 'procurement',
  '/inventory': 'inventory',
  '/production': 'production',
  '/sales': 'sales',
  '/reports': 'reports',
  '/users': 'users',
  '/audit': 'audit',
  '/settings': 'settings',
}

export function ProtectedRoute() {
  const { isAuthenticated, currentUser } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const moduleKey = PATH_MODULE_MAP[location.pathname]
  if (moduleKey && !canViewModule(currentUser?.role, moduleKey)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
