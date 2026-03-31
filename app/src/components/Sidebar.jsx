import { NavLink, useNavigate } from 'react-router-dom'
import {
  FiBarChart2,
  FiBox,
  FiClock,
  FiFileText,
  FiLayers,
  FiLogOut,
  FiSettings,
  FiShoppingBag,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { canViewModule } from '../utils/permissions'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FiTrendingUp, moduleKey: 'dashboard' },
  { to: '/finance', label: 'Finance', icon: FiFileText, moduleKey: 'finance' },
  { to: '/procurement', label: 'Procurement', icon: FiShoppingBag, moduleKey: 'procurement' },
  { to: '/inventory', label: 'Inventory', icon: FiBox, moduleKey: 'inventory' },
  { to: '/production', label: 'Production', icon: FiLayers, moduleKey: 'production' },
  { to: '/sales', label: 'Sales', icon: FiTruck, moduleKey: 'sales' },
  { to: '/reports', label: 'Reports', icon: FiBarChart2, moduleKey: 'reports' },
  { to: '/users', label: 'Users', icon: FiUsers, moduleKey: 'users' },
  { to: '/audit', label: 'Audit Trail', icon: FiClock, moduleKey: 'audit' },
  { to: '/settings', label: 'Settings', icon: FiSettings, moduleKey: 'settings' },
]

export function Sidebar({ collapsed, onToggle }) {
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <button className="sidebar-toggle icon-button" type="button" onClick={onToggle}>
          ☰
        </button>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="brand-title">Foods Pacific</span>
            <span className="brand-subtitle">Cloud ERP</span>
          </div>
        )}
      </div>
      <nav className="sidebar-nav">
        {navItems
          .filter((item) => canViewModule(currentUser?.role, item.moduleKey))
          .map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
              >
                <Icon className="sidebar-link-icon" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-link sidebar-logout"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <FiLogOut className="sidebar-link-icon" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
