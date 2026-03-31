import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'
import { calculateEfficiency, canEditModule } from '../utils/permissions'

export function ProductionPage() {
  const { productionOrders, inventory, createProductionOrder, updateProductionStatus } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('orders')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    productId: '',
    plannedQty: '',
    line: 'Sauce Line 1',
  })

  const stats = useMemo(() => {
    const planned = productionOrders.filter((p) => p.status === 'Planned').length
    const running = productionOrders.filter((p) => p.status === 'Running').length
    const completed = productionOrders.filter((p) => p.status === 'Completed').length
    const delayed = productionOrders.filter((p) => p.status === 'Delayed').length
    const avgEff =
      productionOrders.filter((p) => p.efficiency != null).reduce((sum, p) => sum + p.efficiency, 0) /
        Math.max(1, productionOrders.filter((p) => p.efficiency != null).length) || 0
    const plannedOutput = productionOrders.reduce((sum, p) => sum + (p.plannedQty || 0), 0)
    const actualOutput = productionOrders.reduce((sum, p) => sum + (p.producedQty || 0), 0)
    const overallEff = calculateEfficiency(actualOutput, plannedOutput)
    const downtime = delayed * 1.5
    const yieldPct = Math.min(99.9, 92 + completed * 0.3)
    return { planned, running, completed, delayed, avgEff, plannedOutput, actualOutput, overallEff, downtime, yieldPct }
  }, [productionOrders])

  useMemo(
    () =>
      productionOrders
        .filter((p) => p.status === 'Completed' || p.status === 'Running')
        .map((p) => ({
          label: p.orderNumber,
          value: p.efficiency ?? calculateEfficiency(p.producedQty || 0, p.plannedQty || 0),
        })),
    [productionOrders],
  )

  const boms = [
    { id: 'BOM-001', product: 'Premium Chili Sauce 500ml', materials: [
      { itemId: 'i1', name: 'Sunflower Oil', qty: 0.5, uom: 'kg' },
      { itemId: 'i2', name: 'Chili Flakes', qty: 0.08, uom: 'kg' },
      { itemId: 'i5', name: 'Glass Bottle 500ml', qty: 1, uom: 'pcs' },
      { itemId: 'i6', name: 'Metal Cap 500ml', qty: 1, uom: 'pcs' }
    ]},
    { id: 'BOM-002', product: 'Herb & Garlic Marinade 500ml', materials: [
      { itemId: 'i10', name: 'Canola Oil', qty: 0.55, uom: 'kg' },
      { itemId: 'i3', name: 'Basil Leaves', qty: 0.15, uom: 'kg' },
      { itemId: 'i5', name: 'Glass Bottle 500ml', qty: 1, uom: 'pcs' }
    ]}
  ]

  const canEdit = canEditModule(currentUser?.role, 'production')

  function handleStatusChange(id, status) {
    if (status === 'Completed' && !window.confirm('Mark order as completed and update stock?')) {
      return
    }
    updateProductionStatus(id, status, undefined, currentUser)
    showToast(`Production order marked as ${status.toLowerCase()}.`, 'success')
  }

  function handleCreateOrder(e) {
    e.preventDefault()
    if (!form.productId || !form.plannedQty) return
    const product = inventory.find((i) => i.id === form.productId)
    createProductionOrder(
      {
        productId: form.productId,
        description: `Planned batch for ${product?.name ?? 'product'}`,
        plannedQty: Number(form.plannedQty),
        uom: product?.uom ?? 'bottles',
        line: form.line,
        rawMaterials: [],
      },
      currentUser,
    )
    showToast('Production order created.', 'success')
    setModalOpen(false)
    setForm({ productId: '', plannedQty: '', line: 'Sauce Line 1' })
  }

  return (
    <div className="page">
      <PageHeader
        title="Production & manufacturing"
        subtitle="Control room view of work orders, bottlenecks, and line performance."
        actions={
          canEdit ? (
            <button type="button" className="button primary" onClick={() => setModalOpen(true)}>
              Create production order
            </button>
          ) : null
        }
      />

      <section className="grid grid-5">
        <StatCard
          label="Planned orders"
          value={stats.planned}
          trend="Queued for release"
          tone="neutral"
        />
        <StatCard
          label="Running"
          value={stats.running}
          trend="Across active sauce lines"
          tone="accent"
        />
        <StatCard
          label="Completed this month"
          value={stats.completed}
          trend="Ready for quality release"
          tone="success"
        />
        <StatCard
          label="Delayed"
          value={stats.delayed}
          trend="Requires scheduler attention"
          tone="danger"
        />
        <StatCard
          label="Average efficiency"
          value={`${stats.avgEff.toFixed(1)}%`}
          trend="Based on recent completed orders"
          tone="primary"
        />
      </section>

      <section className="grid grid-4">
        <StatCard
          label="Planned vs actual output"
          value={`${stats.actualOutput.toLocaleString()} / ${stats.plannedOutput.toLocaleString()}`}
          trend="Units produced vs scheduled"
          tone={stats.overallEff >= 95 ? 'success' : stats.overallEff >= 85 ? 'accent' : 'danger'}
        />
        <StatCard
          label="Overall efficiency"
          value={`${stats.overallEff.toFixed(1)}%`}
          trend="Weighted across active orders"
          tone={stats.overallEff >= 95 ? 'success' : stats.overallEff >= 85 ? 'accent' : 'danger'}
        />
        <StatCard
          label="Estimated downtime (hrs)"
          value={stats.downtime.toFixed(1)}
          trend="Based on delayed orders"
          tone={stats.downtime > 4 ? 'danger' : 'warning'}
        />
        <StatCard
          label="Yield"
          value={`${stats.yieldPct.toFixed(1)}%`}
          trend="Good output vs input"
          tone={stats.yieldPct >= 95 ? 'success' : 'warning'}
        />
      </section>

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'orders' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Production Orders
          </button>
          <button
            className={`tab ${activeTab === 'lines' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('lines')}
          >
            Line Status
          </button>
          <button
            className={`tab ${activeTab === 'boms' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('boms')}
          >
            Bill of Materials (BOM)
          </button>
        </div>
      </section>

      {activeTab === 'orders' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Work orders</h3>
              <span className="card-subtitle">By status and line</span>
            </div>
            <DataTable
              columns={[
                { key: 'orderNumber', header: 'Order' },
                {
                  key: 'productId',
                  header: 'Product',
                  render: (value) => inventory.find((i) => i.id === value)?.name ?? value,
                },
                { key: 'line', header: 'Line' },
                { key: 'plannedQty', header: 'Planned qty' },
                { key: 'producedQty', header: 'Produced' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (value) => {
                    const tone =
                      value === 'Completed'
                        ? 'success'
                        : value === 'Running'
                          ? 'accent'
                          : value === 'Delayed'
                            ? 'danger'
                            : 'neutral'
                    return <Badge tone={tone}>{value}</Badge>
                  },
                },
                {
                  key: 'efficiency',
                  header: 'Eff.',
                  render: (value, row) => {
                    const eff =
                      value != null
                        ? value
                        : calculateEfficiency(row.producedQty || 0, row.plannedQty || 0)
                    if (!eff) return '—'
                    const tone = eff >= 95 ? 'success' : eff >= 85 ? 'accent' : 'danger'
                    return <Badge tone={tone}>{`${eff.toFixed(1)}%`}</Badge>
                  },
                },
                {
                  key: 'actions',
                  header: '',
                  render: (_, row) => (
                    <div className="table-actions">
                      {canEdit && row.status === 'Planned' && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleStatusChange(row.id, 'Running')}
                        >
                          Release
                        </button>
                      )}
                      {canEdit && row.status === 'Running' && (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleStatusChange(row.id, 'Completed')}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={productionOrders}
            />
          </div>
        </section>
      )}

      {activeTab === 'lines' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Active line loading</h3>
              <span className="card-subtitle">Real-time throughput</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Sauce Line 1</span>
                <span>Running • Chili sauce and teriyaki batches</span>
              </li>
              <li>
                <span>Sauce Line 2</span>
                <span>Completed • Herb marinade cycle closed</span>
              </li>
              <li>
                <span>Sauce Line 3</span>
                <span>Delayed • Investigating throughput variance</span>
              </li>
              <li>
                <span>Export Line</span>
                <span>Running • Export batch for EU partner</span>
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Raw Material Consumption</h3>
              <span className="card-subtitle">WIP and staged materials</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Sunflower Oil</span>
                <span>Consuming 2.8t for current PRO-2403001</span>
              </li>
              <li>
                <span>Glass Bottles</span>
                <span>40k units staged at Line 1 & 2</span>
              </li>
              <li>
                <span>Chili Flakes</span>
                <span>800kg reserved for next shift</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === 'boms' && (
        <section className="grid grid-2">
          {boms.map((bom) => (
            <div key={bom.id} className="card">
              <div className="card-header">
                <h3>{bom.id}: {bom.product}</h3>
              </div>
              <DataTable
                columns={[
                  { key: 'name', header: 'Material' },
                  { key: 'qty', header: 'Qty (per unit)' },
                  { key: 'uom', header: 'UOM' },
                ]}
                data={bom.materials}
              />
            </div>
          ))}
        </section>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create production order">
        <form className="form-grid" onSubmit={handleCreateOrder}>
          <label className="field">
            <span className="field-label">Finished product</span>
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
            <span className="field-label">Planned quantity</span>
            <input
              type="number"
              className="input"
              value={form.plannedQty}
              onChange={(e) => setForm({ ...form, plannedQty: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Production line</span>
            <select
              className="input input-select"
              value={form.line}
              onChange={(e) => setForm({ ...form, line: e.target.value })}
            >
              <option value="Sauce Line 1">Sauce Line 1</option>
              <option value="Sauce Line 2">Sauce Line 2</option>
              <option value="Sauce Line 3">Sauce Line 3</option>
              <option value="Export Line">Export Line</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
