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
import { canEditModule } from '../utils/permissions'

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

  const [activeTab, setActiveTab] = useState('requisitions')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false)
  const [requisitionForm, setRequisitionForm] = useState({
    supplierId: '',
    itemId: '',
    quantity: '',
    requiredDate: '',
  })

  const canEdit = canEditModule(currentUser?.role, 'procurement')

  const stats = useMemo(() => {
    const pending = purchaseRequisitions.filter((r) => r.status === 'Pending Approval').length
    const approved = purchaseRequisitions.filter((r) => r.status === 'Approved').length
    const rejected = purchaseRequisitions.filter((r) => r.status === 'Rejected').length
    const openPo = purchaseOrders.filter((po) => po.status === 'Open').length
    return { pending, approved, rejected, openPo }
  }, [purchaseRequisitions, purchaseOrders])

  const rfqs = [
    { id: 'RFQ-001', item: 'Sunflower Oil', suppliers: [
      { name: 'Pacific Agro', price: 8.5, leadTime: 7, rating: 'A' },
      { name: 'Pure Oils Asia', price: 8.2, leadTime: 12, rating: 'B' },
      { name: 'Global Spice', price: 8.9, leadTime: 5, rating: 'A' }
    ]},
    { id: 'RFQ-002', item: 'Glass Bottle 500ml', suppliers: [
      { name: 'Premium Packaging', price: 0.45, leadTime: 14, rating: 'A' },
      { name: 'Regional Logistics', price: 0.48, leadTime: 4, rating: 'A' }
    ]}
  ]

  const grns = purchaseOrders.filter(po => po.status === 'Received' || po.status === 'Partially Received').map(po => ({
    id: `GRN-${po.poNumber.split('-')[1]}`,
    poNumber: po.poNumber,
    receivedDate: po.orderDate, // Mocking received date
    supplier: suppliers.find(s => s.id === po.supplierId)?.name,
    status: 'Verified'
  }))

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
          canEdit ? (
            <button
              type="button"
              className="button primary"
              onClick={() => setRequisitionModalOpen(true)}
            >
              New purchase requisition
            </button>
          ) : null
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

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'requisitions' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('requisitions')}
          >
            Requisitions
          </button>
          <button
            className={`tab ${activeTab === 'pos' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            Purchase Orders
          </button>
          <button
            className={`tab ${activeTab === 'rfqs' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('rfqs')}
          >
            RFQ Comparison
          </button>
          <button
            className={`tab ${activeTab === 'grns' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('grns')}
          >
            GRN Tracking
          </button>
          <button
            className={`tab ${activeTab === 'suppliers' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            Suppliers
          </button>
        </div>
      </section>

      {activeTab === 'requisitions' && (
        <section className="grid grid-1">
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
                      {canEdit && row.status === 'Pending Approval' && (
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
                      {canEdit && row.status === 'Approved' && (
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
        </section>
      )}

      {activeTab === 'pos' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Purchase Orders</h3>
              <span className="card-subtitle">Open and historical POs</span>
            </div>
            <DataTable
              columns={[
                { key: 'poNumber', header: 'PO #' },
                {
                  key: 'supplierId',
                  header: 'Supplier',
                  render: (v) => suppliers.find((s) => s.id === v)?.name,
                },
                { key: 'orderDate', header: 'Ordered' },
                { key: 'expectedDate', header: 'Expected' },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (v, row) => `${row.currency} ${v.toLocaleString()}`,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (v) => (
                    <Badge
                      tone={
                        v === 'Received' ? 'success' : v === 'Cancelled' ? 'danger' : 'warning'
                      }
                    >
                      {v}
                    </Badge>
                  ),
                },
              ]}
              data={purchaseOrders}
            />
          </div>
        </section>
      )}

      {activeTab === 'rfqs' && (
        <section className="grid grid-2">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="card">
              <div className="card-header">
                <h3>{rfq.id}: {rfq.item}</h3>
              </div>
              <DataTable
                columns={[
                  { key: 'name', header: 'Supplier' },
                  { key: 'price', header: 'Price ($)' },
                  { key: 'leadTime', header: 'Lead Time (d)' },
                  {
                    key: 'rating',
                    header: 'Rating',
                    render: (v) => <Badge tone={v === 'A' ? 'success' : 'warning'}>{v}</Badge>,
                  },
                ]}
                data={rfq.suppliers}
              />
            </div>
          ))}
        </section>
      )}

      {activeTab === 'grns' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Goods Receipt Notes (GRN)</h3>
              <span className="card-subtitle">Verified receipts from suppliers</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', header: 'GRN #' },
                { key: 'poNumber', header: 'PO Reference' },
                { key: 'supplier', header: 'Supplier' },
                { key: 'receivedDate', header: 'Received Date' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (v) => <Badge tone="success">{v}</Badge>,
                },
              ]}
              data={grns}
            />
          </div>
        </section>
      )}

      {activeTab === 'suppliers' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Supplier Registry</h3>
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
                  render: (value) => (
                    <Badge tone={value === 'A' ? 'success' : 'neutral'}>{value}</Badge>
                  ),
                },
              ]}
              data={suppliers}
            />
          </div>
        </section>
      )}

      {canEdit && (
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
      )}
    </div>
  )
}
