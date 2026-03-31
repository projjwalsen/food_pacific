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

export function InventoryPage() {
  const { inventory, auditLogs, adjustInventory } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('items')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [adjustForm, setAdjustForm] = useState({ delta: '', reason: '' })

  const canEdit = canEditModule(currentUser?.role, 'inventory')

  const stats = useMemo(() => {
    const totalSkus = inventory.length
    const raw = inventory.filter((i) => i.type === 'Raw').length
    const finished = inventory.filter((i) => i.type === 'Finished').length
    const lowStock = inventory.filter((i) => i.onHand <= i.reorderLevel).length
    const totalValue = inventory.reduce((sum, i) => sum + i.onHand * (i.estimatedCost || 1), 0)
    return { totalSkus, raw, finished, lowStock, totalValue }
  }, [inventory])

  const warehouses = useMemo(() => {
    const map = {}
    inventory.forEach((item) => {
      if (!map[item.warehouse]) {
        map[item.warehouse] = { name: item.warehouse, items: 0, totalStock: 0 }
      }
      map[item.warehouse].items += 1
      map[item.warehouse].totalStock += item.onHand
    })
    return Object.values(map)
  }, [inventory])

  const filteredInventory = useMemo(
    () =>
      inventory.filter((i) => {
        const matchesSearch =
          !search ||
          i.sku.toLowerCase().includes(search.toLowerCase()) ||
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === 'all' || i.type === typeFilter
        return matchesSearch && matchesType
      }),
    [inventory, search, typeFilter],
  )

  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.onHand <= i.reorderLevel),
    [inventory],
  )

  const agingBuckets = useMemo(() => {
    const now = new Date()
    const bucket = { '0-30': 0, '30-60': 0, '60+': 0 }
    inventory.forEach((item) => {
      if (!item.batch || !item.expiryDate) return
      const exp = new Date(item.expiryDate)
      const diffDays = Math.round((exp - now) / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) bucket['0-30'] += item.onHand
      else if (diffDays <= 60) bucket['30-60'] += item.onHand
      else bucket['60+'] += item.onHand
    })
    return bucket
  }, [inventory])

  const movementSpeed = useMemo(() => {
    const map = {}
    auditLogs
      .filter((a) => a.module === 'Inventory' && a.action === 'Stock Adjustment')
      .forEach((a) => {
        const match = a.details.match(/to (i\d+)./)
        const itemId = match ? match[1] : null
        if (!itemId) return
        map[itemId] = (map[itemId] || 0) + 1
      })
    const itemsWithSpeed = inventory.map((i) => ({
      ...i,
      moves: map[i.id] || 0,
    }))
    const fastMoving = itemsWithSpeed.filter((i) => i.moves >= 2)
    const deadStock = itemsWithSpeed.filter((i) => i.moves === 0 && i.onHand > 0)
    const slowMoving = itemsWithSpeed.filter(
      (i) => i.moves === 1 && i.onHand > 0 && !fastMoving.includes(i),
    )
    return { fastMoving, slowMoving, deadStock }
  }, [auditLogs, inventory])

  const movements = useMemo(
    () =>
      auditLogs
        .filter((a) => a.module === 'Inventory' || a.module === 'Production')
        .slice(0, 10),
    [auditLogs],
  )

  function handleFilterChange(key, value) {
    if (key === 'type') setTypeFilter(value)
  }

  function openAdjustModal(itemId) {
    if (!canEdit) return
    setSelectedItemId(itemId)
    setAdjustForm({ delta: '', reason: '' })
    setAdjustModalOpen(true)
  }

  function handleAdjustSubmit(e) {
    e.preventDefault()
    const delta = Number(adjustForm.delta || 0)
    if (!delta || !adjustForm.reason) return
    adjustInventory(selectedItemId, delta, adjustForm.reason, currentUser)
    showToast('Stock level adjusted.', 'success')
    setAdjustModalOpen(false)
  }

  return (
    <div className="page">
      <PageHeader
        title="Inventory overview"
        subtitle="Live view of raw materials, packaging, and finished goods across Foods Pacific."
      />

      <section className="grid grid-4">
        <StatCard
          label="Active SKUs"
          value={stats.totalSkus}
          trend="Raw, packaging, and finished goods"
          tone="primary"
        />
        <StatCard
          label="Raw materials"
          value={stats.raw}
          trend="Ready for batching"
          tone="accent"
        />
        <StatCard
          label="Finished goods"
          value={stats.finished}
          trend="Available for order allocation"
          tone="success"
        />
        <StatCard
          label="Low stock alerts"
          value={stats.lowStock}
          trend="Below configured reorder level"
          tone="danger"
        />
      </section>

      <section className="grid grid-4">
        <StatCard
          label="Inventory value (index)"
          value={stats.totalValue.toLocaleString()}
          trend="Based on relative costing per SKU"
          tone="neutral"
        />
        <StatCard
          label="Fast moving SKUs"
          value={movementSpeed.fastMoving.length}
          trend="Frequent movement in recent period"
          tone="accent"
        />
        <StatCard
          label="Slow moving SKUs"
          value={movementSpeed.slowMoving.length}
          trend="Occasional movement, monitor usage"
          tone="warning"
        />
        <StatCard
          label="Dead stock SKUs"
          value={movementSpeed.deadStock.length}
          trend="No recent movement, consider action"
          tone="danger"
        />
      </section>

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'items' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Inventory Items
          </button>
          <button
            className={`tab ${activeTab === 'warehouses' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('warehouses')}
          >
            Warehouses
          </button>
          <button
            className={`tab ${activeTab === 'batches' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            Batch & Expiry
          </button>
          <button
            className={`tab ${activeTab === 'movements' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            Movement History
          </button>
          <button
            className={`tab ${activeTab === 'analytics' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Inventory Analytics
          </button>
        </div>
      </section>

      {activeTab === 'items' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Inventory by item</h3>
              <span className="card-subtitle">Global SKU overview</span>
            </div>
            <SearchFilterBar
              search={search}
              onSearchChange={setSearch}
              filters={[
                {
                  key: 'type',
                  value: typeFilter,
                  options: [
                    { value: 'all', label: 'All types' },
                    { value: 'Raw', label: 'Raw materials' },
                    { value: 'Packaging', label: 'Packaging' },
                    { value: 'Finished', label: 'Finished goods' },
                  ],
                },
              ]}
              onFilterChange={handleFilterChange}
              placeholder="Search by SKU, item, or category"
            />
            <DataTable
              columns={[
                { key: 'sku', header: 'SKU' },
                { key: 'name', header: 'Item' },
                { key: 'warehouse', header: 'Warehouse' },
                { key: 'onHand', header: 'On hand' },
                { key: 'reserved', header: 'Reserved' },
                { key: 'reorderLevel', header: 'Reorder level' },
                {
                  key: 'type',
                  header: 'Type',
                  render: (value) => <Badge tone="neutral">{value}</Badge>,
                },
                {
                  key: 'id',
                  header: '',
                  render: (value) =>
                    canEdit ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => openAdjustModal(value)}
                      >
                        Adjust
                      </button>
                    ) : null,
                },
              ]}
              data={filteredInventory}
            />
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Reorder suggestions</h3>
              <span className="card-subtitle">Planning view</span>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="empty-state">
                Inventory levels are currently above minimum safety thresholds.
              </div>
            ) : (
              <ul className="summary-list">
                {lowStockItems.map((item) => (
                  <li key={item.id}>
                    <div>
                      <div>{item.name}</div>
                      <div className="muted">
                        {item.sku} • {item.warehouse}
                      </div>
                    </div>
                    <div>
                      <div>
                        On hand {item.onHand} {item.uom}
                      </div>
                      <div className="muted">
                        Reorder at {item.reorderLevel} {item.uom}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {activeTab === 'warehouses' && (
        <section className="grid grid-3">
          {warehouses.map((w) => (
            <div key={w.name} className="card">
              <div className="card-header">
                <h3>{w.name}</h3>
              </div>
              <StatCard label="Unique SKUs" value={w.items} tone="neutral" />
              <StatCard label="Total Units" value={w.totalStock.toLocaleString()} tone="accent" />
            </div>
          ))}
        </section>
      )}

      {activeTab === 'batches' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Batch & Expiry Tracking</h3>
              <span className="card-subtitle">Ensuring FEFO compliance</span>
            </div>
            <DataTable
              columns={[
                { key: 'sku', header: 'SKU' },
                { key: 'name', header: 'Item' },
                { key: 'batch', header: 'Batch #' },
                {
                  key: 'expiryDate',
                  header: 'Expiry Date',
                  render: (v) => {
                    const isExpired = v && new Date(v) < new Date()
                    const isSoon =
                      v &&
                      new Date(v) < new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
                    return (
                      <Badge tone={isExpired ? 'danger' : isSoon ? 'warning' : 'success'}>
                        {v || 'N/A'}
                      </Badge>
                    )
                  },
                },
                { key: 'onHand', header: 'Qty' },
                { key: 'uom', header: 'UOM' },
              ]}
              data={inventory.filter((i) => i.batch)}
            />
          </div>
        </section>
      )}

      {activeTab === 'movements' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Stock Movement History</h3>
              <span className="card-subtitle">Audit trail of physical changes</span>
            </div>
            <ul className="timeline">
              {movements.map((m) => (
                <li key={m.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-module">{m.module}</span>
                      <span className="timeline-time">
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="timeline-title">{m.action}</div>
                    <div className="timeline-body">{m.details}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Stock aging analysis</h3>
              <span className="card-subtitle">By remaining shelf life</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>0–30 days</span>
                <span>{agingBuckets['0-30'].toLocaleString()} units at risk</span>
              </li>
              <li>
                <span>30–60 days</span>
                <span>{agingBuckets['30-60'].toLocaleString()} units</span>
              </li>
              <li>
                <span>60+ days</span>
                <span>{agingBuckets['60+'].toLocaleString()} units</span>
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Inventory insights</h3>
              <span className="card-subtitle">Fast, slow, and dead stock</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Fast moving items</span>
                <span>{movementSpeed.fastMoving.map((i) => i.sku).join(', ') || 'None'}</span>
              </li>
              <li>
                <span>Slow moving items</span>
                <span>{movementSpeed.slowMoving.map((i) => i.sku).join(', ') || 'None'}</span>
              </li>
              <li>
                <span>Dead stock</span>
                <span>{movementSpeed.deadStock.map((i) => i.sku).join(', ') || 'None'}</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      {canEdit && (
        <Modal
          open={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title="Adjust stock level"
          size="sm"
        >
          <form className="form-grid" onSubmit={handleAdjustSubmit}>
          <label className="field">
            <span className="field-label">Adjustment quantity</span>
            <input
              type="number"
              className="input"
              value={adjustForm.delta}
              onChange={(e) => setAdjustForm({ ...adjustForm, delta: e.target.value })}
              placeholder="Use negative value to reduce stock"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Reason</span>
            <input
              type="text"
              className="input"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              required
            />
          </label>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setAdjustModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Apply adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
