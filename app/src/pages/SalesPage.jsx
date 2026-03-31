import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'
import { canEditModule } from '../utils/permissions'

export function SalesPage() {
  const { salesOrders, inventory, createSalesOrder, updateSalesStatus } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('orders')
  const [detailOrder, setDetailOrder] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [form, setForm] = useState({
    customer: '',
    region: 'Singapore',
    currency: 'SGD',
    amount: '',
    productId: '',
    quantity: '',
  })

  const canEdit = canEditModule(currentUser?.role, 'sales')

  const stats = useMemo(() => {
    const open = salesOrders.filter((o) => o.status !== 'Dispatched').length
    const dispatched = salesOrders.filter((o) => o.status === 'Dispatched').length
    const total = salesOrders.reduce((sum, o) => sum + o.amount, 0)
    const exportShare =
      salesOrders.filter((o) => o.region !== 'Singapore').reduce((sum, o) => sum + o.amount, 0) ||
      0
    return { open, dispatched, total, exportShare }
  }, [salesOrders])

  const quotations = [
    { id: 'QT-2401', customer: 'New Retailer X', date: '2026-04-01', amount: 15000, status: 'Draft' },
    { id: 'QT-2402', customer: 'Global Export Co', date: '2026-04-03', amount: 85000, status: 'Sent' },
    { id: 'QT-2403', customer: 'Local Hotel Chain', date: '2026-04-05', amount: 12000, status: 'Accepted' }
  ]

  const dispatchTracking = salesOrders.filter(o => o.status === 'Dispatched').map(o => ({
    id: `TRK-${o.orderNumber.split('-')[1]}`,
    orderNumber: o.orderNumber,
    customer: o.customer,
    carrier: 'Pacific Logistics',
    status: 'In Transit',
    eta: '2026-04-15'
  }))

  function handleStatusChange(id, status) {
    updateSalesStatus(id, status, currentUser)
    showToast(`Sales order updated to ${status}.`, 'success')
  }

  function openDetail(order) {
    setDetailOrder(order)
  }

  function handleCreateOrder(e) {
    e.preventDefault()
    if (!form.customer || !form.productId || !form.quantity || !form.amount) return
    const qty = Number(form.quantity)
    const amount = Number(form.amount)
    createSalesOrder(
      {
        customer: form.customer,
        region: form.region,
        currency: form.currency,
        amount,
        deliveryDate: null,
        items: [{ itemId: form.productId, quantity: qty, uom: 'bottles' }],
      },
      currentUser,
    )
    showToast('Sales order created and inventory reserved.', 'success')
    setCreateModalOpen(false)
    setForm({
      customer: '',
      region: 'Singapore',
      currency: 'SGD',
      amount: '',
      productId: '',
      quantity: '',
    })
  }

  const topProducts = useMemo(() => {
    const counts = {}
    salesOrders.forEach((so) => {
      so.items?.forEach((line) => {
        counts[line.itemId] = (counts[line.itemId] || 0) + line.quantity
      })
    })
    return Object.entries(counts)
      .map(([itemId, qty]) => ({
        itemId,
        qty,
        name: inventory.find((i) => i.id === itemId)?.name ?? itemId,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [salesOrders, inventory])

  return (
    <div className="page">
      <PageHeader
        title="Sales & distribution"
        subtitle="Stay close to demand, export channels, and dispatch performance."
        actions={
          canEdit ? (
            <button
              type="button"
              className="button primary"
              onClick={() => setCreateModalOpen(true)}
            >
              Create sales order
            </button>
          ) : null
        }
      />

      <section className="grid grid-4">
        <StatCard
          label="Total order value"
          value={`$${stats.total.toLocaleString()}`}
          trend="All open and dispatched orders"
          tone="primary"
        />
        <StatCard
          label="Open orders"
          value={stats.open}
          trend="Awaiting picking or dispatch"
          tone="accent"
        />
        <StatCard
          label="Dispatched orders"
          value={stats.dispatched}
          trend="In transit to customers"
          tone="success"
        />
        <StatCard
          label="Export contribution"
          value={`$${stats.exportShare.toLocaleString()}`}
          trend="Regional and EU partners"
          tone="neutral"
        />
      </section>

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'orders' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Sales Orders
          </button>
          <button
            className={`tab ${activeTab === 'quotations' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('quotations')}
          >
            Quotations
          </button>
          <button
            className={`tab ${activeTab === 'dispatch' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('dispatch')}
          >
            Dispatch Tracking
          </button>
          <button
            className={`tab ${activeTab === 'analytics' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Sales Analytics
          </button>
        </div>
      </section>

      {activeTab === 'orders' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Customer orders</h3>
              <span className="card-subtitle">With dispatch status</span>
            </div>
            <DataTable
              columns={[
                { key: 'orderNumber', header: 'Order' },
                { key: 'customer', header: 'Customer' },
                { key: 'region', header: 'Region' },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (value, row) => `${row.currency} ${value.toLocaleString()}`,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (value) => {
                    const tone =
                      value === 'Dispatched'
                        ? 'success'
                        : value === 'Packed'
                          ? 'accent'
                          : value === 'In Picking'
                            ? 'warning'
                            : 'neutral'
                    return <Badge tone={tone}>{value}</Badge>
                  },
                },
                {
                  key: 'actions',
                  header: '',
                  render: (_, row) => (
                    <div className="table-actions">
                      <button type="button" className="link-button" onClick={() => openDetail(row)}>
                        View
                      </button>
                      {canEdit && row.status !== 'Dispatched' && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleStatusChange(row.id, 'Dispatched')}
                        >
                          Mark dispatched
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={salesOrders}
            />
          </div>
        </section>
      )}

      {activeTab === 'quotations' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Active Quotations</h3>
              <span className="card-subtitle">Pre-sales pipeline</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', header: 'Quote #' },
                { key: 'customer', header: 'Customer' },
                { key: 'date', header: 'Date' },
                { key: 'amount', header: 'Value', render: (v) => v.toLocaleString() },
                {
                  key: 'status',
                  header: 'Status',
                  render: (v) => (
                    <Badge
                      tone={v === 'Accepted' ? 'success' : v === 'Sent' ? 'accent' : 'neutral'}
                    >
                      {v}
                    </Badge>
                  ),
                },
              ]}
              data={quotations}
            />
          </div>
        </section>
      )}

      {activeTab === 'dispatch' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Dispatch Tracking</h3>
              <span className="card-subtitle">Real-time logistics status</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', header: 'Tracking #' },
                { key: 'orderNumber', header: 'SO Reference' },
                { key: 'customer', header: 'Customer' },
                { key: 'carrier', header: 'Carrier' },
                { key: 'eta', header: 'ETA' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (v) => <Badge tone="accent">{v}</Badge>,
                },
              ]}
              data={dispatchTracking}
            />
          </div>
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Top selling products</h3>
              <span className="card-subtitle">By quantity ordered</span>
            </div>
            <ul className="summary-list">
              {topProducts.map((p) => (
                <li key={p.itemId}>
                  <span>{p.name}</span>
                  <span>{p.qty.toLocaleString()} units</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Regional Performance</h3>
              <span className="card-subtitle">Market share distribution</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Singapore</span>
                <span>Core retail and food service accounts (45%)</span>
              </li>
              <li>
                <span>ASEAN</span>
                <span>Growing regional distribution footprint (30%)</span>
              </li>
              <li>
                <span>Europe / Global</span>
                <span>Strategic export partners (25%)</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      <Modal
        open={detailOrder != null}
        onClose={() => setDetailOrder(null)}
        title={detailOrder ? `Order ${detailOrder.orderNumber}` : 'Order'}
      >
        {detailOrder ? (
          <div className="order-detail">
            <div className="order-detail-row">
              <span>Customer</span>
              <span>{detailOrder.customer}</span>
            </div>
            <div className="order-detail-row">
              <span>Region</span>
              <span>{detailOrder.region}</span>
            </div>
            <div className="order-detail-row">
              <span>Status</span>
              <Badge tone="neutral">{detailOrder.status}</Badge>
            </div>
            <div className="order-detail-row">
              <span>Order value</span>
              <span>
                {detailOrder.currency} {detailOrder.amount.toLocaleString()}
              </span>
            </div>
            <div className="order-detail-row">
              <span>Lines</span>
              <ul>
                {detailOrder.items?.map((line, idx) => {
                  const item = inventory.find((i) => i.id === line.itemId)
                  return (
                    <li key={idx}>
                      {item?.name ?? line.itemId} — {line.quantity} {line.uom}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>

      {canEdit && (
        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create sales order"
        >
          <form className="form-grid" onSubmit={handleCreateOrder}>
          <label className="field">
            <span className="field-label">Customer</span>
            <input
              type="text"
              className="input"
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Region</span>
            <select
              className="input input-select"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            >
              <option value="Singapore">Singapore</option>
              <option value="Malaysia">Malaysia</option>
              <option value="Indonesia">Indonesia</option>
              <option value="ASEAN">ASEAN</option>
              <option value="Europe">Europe</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Currency</span>
            <select
              className="input input-select"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Order value</span>
            <input
              type="number"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Product</span>
            <select
              className="input input-select"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
            >
              <option value="">Select finished good</option>
              {inventory
                .filter((i) => i.type === 'Finished')
                .map((i) => (
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
              className="input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </label>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Save order
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
