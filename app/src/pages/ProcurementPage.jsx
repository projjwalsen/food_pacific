import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'

export function ProcurementPage() {
  const {
    suppliers,
    purchaseRequisitions,
    purchaseOrders,
    inventory,
    createRequisition,
    updateRequisitionStatus,
    createPurchaseOrderFromRequisition,
  } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false)
  const [requisitionForm, setRequisitionForm] = useState({
    supplierId: '',
    itemId: '',
    quantity: '',
    requiredDate: '',
  })

  const stats = useMemo(() => {
    const pending = purchaseRequisitions.filter((r) => r.status === 'Pending Approval').length
    const approved = purchaseRequisitions.filter((r) => r.status === 'Approved').length
    const rejected = purchaseRequisitions.filter((r) => r.status === 'Rejected').length
    const openPo = purchaseOrders.filter((po) => po.status === 'Open').length
    return { pending, approved, rejected, openPo }
  }, [purchaseRequisitions, purchaseOrders])

  const filteredRequisitions = useMemo(
    () =>
      purchaseRequisitions.filter((r) => {
        const supplier = suppliers.find((s) => s.id === r.supplierId)
        const item = inventory.find((i) => i.id === r.itemId)
        const matchesSearch =
          !search ||
          r.reqNumber.toLowerCase().includes(search.toLowerCase()) ||
          supplier?.name.toLowerCase().includes(search.toLowerCase()) ||
          item?.name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [purchaseRequisitions, search, statusFilter, suppliers, inventory],
  )

  function handleFilterChange(key, value) {
    if (key === 'status') setStatusFilter(value)
  }

  function handleCreateRequisition(e) {
    e.preventDefault()
    if (!requisitionForm.supplierId || !requisitionForm.itemId || !requisitionForm.quantity) return
    const supplier = suppliers.find((s) => s.id === requisitionForm.supplierId)
    const item = inventory.find((i) => i.id === requisitionForm.itemId)
    createRequisition(
      {
        supplierId: requisitionForm.supplierId,
        itemId: requisitionForm.itemId,
        quantity: Number(requisitionForm.quantity),
        uom: item?.uom ?? '',
        requiredDate: requisitionForm.requiredDate || new Date().toISOString().slice(0, 10),
        requester: currentUser?.name ?? 'Planner',
        department: 'Procurement',
      },
      currentUser,
    )
    showToast(`Requisition created for ${item?.name} with ${supplier?.name}.`, 'success')
    setRequisitionModalOpen(false)
    setRequisitionForm({
      supplierId: '',
      itemId: '',
      quantity: '',
      requiredDate: '',
    })
  }

  function handleApprove(id) {
    updateRequisitionStatus(id, 'Approved', currentUser)
    showToast('Requisition approved.', 'success')
  }

  function handleReject(id) {
    if (!window.confirm('Reject this requisition?')) return
    updateRequisitionStatus(id, 'Rejected', currentUser)
    showToast('Requisition rejected.', 'info')
  }

  function handleCreatePo(id) {
    createPurchaseOrderFromRequisition(id, currentUser)
    showToast('Purchase order generated from requisition.', 'success')
  }

  return (
    <div className="page">
      <PageHeader
        title="Procurement control tower"
        subtitle="Manage suppliers, requisitions, and purchase orders with clear approval flows."
        actions={
          <button
            type="button"
            className="button primary"
            onClick={() => setRequisitionModalOpen(true)}
          >
            New purchase requisition
          </button>
        }
      />

      <section className="grid grid-4">
        <StatCard
          label="Active suppliers"
          value={suppliers.length}
          trend="Segmented by material category"
          tone="primary"
        />
        <StatCard
          label="Pending approvals"
          value={stats.pending}
          trend="Requisitions awaiting review"
          tone="warning"
        />
        <StatCard
          label="Approved this week"
          value={stats.approved}
          trend="Ready for PO conversion"
          tone="success"
        />
        <StatCard
          label="Open purchase orders"
          value={stats.openPo}
          trend="Monitoring deliveries and GRNs"
          tone="accent"
        />
      </section>

      <section className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Purchase requisitions</h3>
            <span className="card-subtitle">With approval workflow</span>
          </div>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            filters={[
              {
                key: 'status',
                value: statusFilter,
                options: [
                  { value: 'all', label: 'All statuses' },
                  { value: 'Pending Approval', label: 'Pending approval' },
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Rejected', label: 'Rejected' },
                ],
              },
            ]}
            onFilterChange={handleFilterChange}
            placeholder="Search by requisition, supplier, or item"
          />
          <DataTable
            columns={[
              { key: 'reqNumber', header: 'Requisition' },
              {
                key: 'supplierId',
                header: 'Supplier',
                render: (value) => suppliers.find((s) => s.id === value)?.name ?? value,
              },
              {
                key: 'itemId',
                header: 'Item',
                render: (value) => inventory.find((i) => i.id === value)?.name ?? value,
              },
              { key: 'quantity', header: 'Qty' },
              { key: 'requiredDate', header: 'Required' },
              {
                key: 'status',
                header: 'Status',
                render: (value) => (
                  <Badge
                    tone={
                      value === 'Approved'
                        ? 'success'
                        : value === 'Rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {value}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (_, row) => (
                  <div className="table-actions">
                    {row.status === 'Pending Approval' && (
                      <>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleApprove(row.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="link-button subtle"
                          onClick={() => handleReject(row.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {row.status === 'Approved' && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleCreatePo(row.id)}
                      >
                        Create PO
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            data={filteredRequisitions}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Suppliers</h3>
            <span className="card-subtitle">Strategic partner overview</span>
          </div>
          <DataTable
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Supplier' },
              { key: 'category', header: 'Category' },
              { key: 'leadTimeDays', header: 'Lead time (days)' },
              {
                key: 'rating',
                header: 'Rating',
                render: (value) => <Badge tone={value === 'A' ? 'success' : 'neutral'}>{value}</Badge>,
              },
            ]}
            data={suppliers}
          />
        </div>
      </section>

      <Modal
        open={requisitionModalOpen}
        onClose={() => setRequisitionModalOpen(false)}
        title="Create purchase requisition"
        size="md"
      >
        <form className="form-grid" onSubmit={handleCreateRequisition}>
          <label className="field">
            <span className="field-label">Supplier</span>
            <select
              className="input input-select"
              value={requisitionForm.supplierId}
              onChange={(e) =>
                setRequisitionForm({ ...requisitionForm, supplierId: e.target.value })
              }
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Item</span>
            <select
              className="input input-select"
              value={requisitionForm.itemId}
              onChange={(e) => setRequisitionForm({ ...requisitionForm, itemId: e.target.value })}
              required
            >
              <option value="">Select item</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Quantity</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={requisitionForm.quantity}
              onChange={(e) => setRequisitionForm({ ...requisitionForm, quantity: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Required date</span>
            <input
              type="date"
              className="input"
              value={requisitionForm.requiredDate}
              onChange={(e) =>
                setRequisitionForm({ ...requisitionForm, requiredDate: e.target.value })
              }
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setRequisitionModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="button primary">
              Submit for approval
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

