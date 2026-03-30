import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { ToastContainer } from '../components/ToastContainer'

const titleMap = {
  '/dashboard': 'Executive Overview',
  '/finance': 'Finance',
  '/procurement': 'Procurement',
  '/inventory': 'Inventory',
  '/production': 'Production & Manufacturing',
  '/sales': 'Sales & Distribution',
  '/reports': 'Reports & Analytics',
  '/users': 'Users & Roles',
  '/audit': 'Audit Trail',
  '/settings': 'Settings',
}

export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(
    typeof window !== 'undefined' && window.innerWidth < 1024,
  )

  const headerTitle = titleMap[location.pathname] ?? 'Foods Pacific ERP'

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="app-shell-main">
        <Header title={headerTitle} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
