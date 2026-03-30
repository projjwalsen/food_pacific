import { useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'

const roleDescriptions = {
  Admin: 'Full system access and configuration rights.',
  'Finance Manager': 'Controls invoicing, payments, and GL integration.',
  'Procurement Officer': 'Manages suppliers, requisitions, and purchase orders.',
  'Inventory Manager': 'Owns stock levels, warehouses, and adjustments.',
  'Production Manager': 'Controls production orders and shop floor execution.',
  'Sales Manager': 'Oversees sales orders, customers, and pricing.',
  Viewer: 'Read-only access across modules.',
  'Operations Manager': 'Cross-functional visibility across production and supply chain.',
}

export function UsersPage() {
  const { users, addUser, updateUser } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    department: '',
  })

  function openAddModal() {
    setForm({
      name: '',
      email: '',
      role: 'Viewer',
      department: '',
    })
    setAddModalOpen(true)
  }

  function openEditModal(user) {
    setEditUser(user)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department ?? '',
    })
  }

  function handleAddSubmit(e) {
    e.preventDefault()
    addUser(form, currentUser)
    showToast('User created with default role permissions.', 'success')
    setAddModalOpen(false)
  }

  function handleEditSubmit(e) {
    e.preventDefault()
    if (!editUser) return
    updateUser(
      editUser.id,
      {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
      },
      currentUser,
    )
    showToast('User profile updated.', 'success')
    setEditUser(null)
  }

  function handleDeactivate(user) {
    if (!window.confirm('Deactivate this user account?')) return
    updateUser(
      user.id,
      {
        status: user.status === 'Active' ? 'Inactive' : 'Active',
      },
      currentUser,
    )
    showToast('User status updated.', 'info')
  }

  return (
    <div className="page">
      <PageHeader
        title="Users & roles"
        subtitle="Control who can approve, post, and configure each module in the ERP."
        actions={
          <button type="button" className="button primary" onClick={openAddModal}>
            Add user
          </button>
        }
      />

      <section className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Users</h3>
            <span className="card-subtitle">Role-based access control</span>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              {
                key: 'role',
                header: 'Role',
                render: (value) => <Badge tone="neutral">{value}</Badge>,
              },
              { key: 'department', header: 'Department' },
              {
                key: 'status',
                header: 'Status',
                render: (value) => (
                  <Badge tone={value === 'Active' ? 'success' : 'danger'}>{value}</Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (_, row) => (
                  <div className="table-actions">
                    <button type="button" className="link-button" onClick={() => openEditModal(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="link-button subtle"
                      onClick={() => handleDeactivate(row)}
                    >
                      {row.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ),
              },
            ]}
            data={users}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Role catalogue</h3>
            <span className="card-subtitle">Permissions at a glance</span>
          </div>
          <ul className="summary-list">
            {Object.entries(roleDescriptions).map(([role, description]) => (
              <li key={role}>
                <div>
                  <Badge tone="neutral">{role}</Badge>
                </div>
                <span>{description}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add user">
        <form className="form-grid" onSubmit={handleAddSubmit}>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Role</span>
            <select
              className="input input-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="Admin">Admin</option>
              <option value="Finance Manager">Finance Manager</option>
              <option value="Procurement Officer">Procurement Officer</option>
              <option value="Inventory Manager">Inventory Manager</option>
              <option value="Production Manager">Production Manager</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Department</span>
            <input
              type="text"
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save user
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editUser != null}
        onClose={() => setEditUser(null)}
        title={editUser ? `Edit ${editUser.name}` : 'Edit user'}
      >
        <form className="form-grid" onSubmit={handleEditSubmit}>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Role</span>
            <select
              className="input input-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="Admin">Admin</option>
              <option value="Finance Manager">Finance Manager</option>
              <option value="Procurement Officer">Procurement Officer</option>
              <option value="Inventory Manager">Inventory Manager</option>
              <option value="Production Manager">Production Manager</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Department</span>
            <input
              type="text"
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setEditUser(null)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

