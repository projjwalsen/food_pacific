import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'

export function ProductionPage() {
  const { productionOrders, inventory, createProductionOrder, updateProductionStatus } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

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
    return { planned, running, completed, delayed, avgEff }
  }, [productionOrders])

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
          <button type="button" className="button primary" onClick={() => setModalOpen(true)}>
            Create production order
          </button>
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

      <section className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Production orders</h3>
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
                render: (value) => (value != null ? `${value}%` : '—'),
              },
              {
                key: 'actions',
                header: '',
                render: (_, row) => (
                  <div className="table-actions">
                    {row.status === 'Planned' && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleStatusChange(row.id, 'Running')}
                      >
                        Release
                      </button>
                    )}
                    {row.status === 'Running' && (
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

        <div className="card">
          <div className="card-header">
            <h3>Line status</h3>
            <span className="card-subtitle">Machine loading overview</span>
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
      </section>

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

