import { NavLink, useNavigate } from 'react-router-dom'
import { FiBarChart2, FiBox, FiClock, FiFileText, FiLayers, FiLogOut, FiSettings, FiShoppingBag, FiTrendingUp, FiTruck, FiUsers } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FiTrendingUp },
  { to: '/finance', label: 'Finance', icon: FiFileText },
  { to: '/procurement', label: 'Procurement', icon: FiShoppingBag },
  { to: '/inventory', label: 'Inventory', icon: FiBox },
  { to: '/production', label: 'Production', icon: FiLayers },
  { to: '/sales', label: 'Sales', icon: FiTruck },
  { to: '/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/users', label: 'Users', icon: FiUsers },
  { to: '/audit', label: 'Audit Trail', icon: FiClock },
  { to: '/settings', label: 'Settings', icon: FiSettings },
]

export function Sidebar({ collapsed, onToggle }) {
  const { logout } = useAuth()
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
        {navItems.map((item) => {
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
