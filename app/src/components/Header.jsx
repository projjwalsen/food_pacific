import { FiBell, FiChevronDown, FiSearch, FiUser } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'

export function Header({ title }) {
  const { currentUser } = useAuth()
  const { notifications } = useErp()

  const unreadCount = notifications.length

  return (
    <header className="app-header">
      <div className="app-header-left">
        <h2 className="app-header-title">{title}</h2>
      </div>
      <div className="app-header-center">
        <div className="header-search">
          <FiSearch className="header-search-icon" />
          <input
            type="search"
            className="header-search-input"
            placeholder="Search in Foods Pacific ERP"
          />
        </div>
      </div>
      <div className="app-header-right">
        <button type="button" className="icon-button header-icon-button">
          <FiBell />
          {unreadCount ? <span className="badge-dot" /> : null}
        </button>
        <div className="header-profile">
          <div className="header-avatar">
            <FiUser />
          </div>
          <div className="header-profile-text">
            <span className="header-profile-name">{currentUser?.name}</span>
            <span className="header-profile-role">{currentUser?.role}</span>
          </div>
          <FiChevronDown className="header-profile-chevron" />
        </div>
      </div>
    </header>
  )
}

