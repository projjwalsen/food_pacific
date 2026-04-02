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
import { calculateLandedCost, calculateVariance, calculateYield } from '../utils/metrics'

const BOMS = [
  {
    id: 'BOM-001',
    product: 'Premium Chili Sauce 500ml',
    materials: [
      { itemId: 'i1', name: 'Sunflower Oil', qty: 0.5, uom: 'kg' },
      { itemId: 'i2', name: 'Chili Flakes', qty: 0.08, uom: 'kg' },
      { itemId: 'i5', name: 'Glass Bottle 500ml', qty: 1, uom: 'pcs' },
      { itemId: 'i6', name: 'Metal Cap 500ml', qty: 1, uom: 'pcs' },
    ],
  },
  {
    id: 'BOM-002',
    product: 'Herb & Garlic Marinade 500ml',
    materials: [
      { itemId: 'i10', name: 'Canola Oil', qty: 0.55, uom: 'kg' },
      { itemId: 'i3', name: 'Basil Leaves', qty: 0.15, uom: 'kg' },
      { itemId: 'i5', name: 'Glass Bottle 500ml', qty: 1, uom: 'pcs' },
    ],
  },
]

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
    return {
      planned,
      running,
      completed,
      delayed,
      avgEff,
      plannedOutput,
      actualOutput,
      overallEff,
      downtime,
      yieldPct,
    }
  }, [productionOrders])

  const lineUtilizationRows = useMemo(() => {
    const map = {}
    productionOrders.forEach((order) => {
      if (!map[order.line]) {
        map[order.line] = { line: order.line, planned: 0, running: 0, completed: 0, delayed: 0 }
      }
      if (order.status === 'Planned') map[order.line].planned += 1
      if (order.status === 'Running') map[order.line].running += 1
      if (order.status === 'Completed') map[order.line].completed += 1
      if (order.status === 'Delayed') map[order.line].delayed += 1
    })
    return Object.values(map).map((row) => {
      const total = row.planned + row.running + row.completed + row.delayed || 1
      const utilization = ((row.running + row.completed) / total) * 100
      return {
        ...row,
        utilization,
      }
    })
  }, [productionOrders])

  const wipOrders = useMemo(
    () =>
      productionOrders.filter(
        (p) => p.status === 'Running' || p.status === 'Delayed' || p.status === 'Planned',
      ),
    [productionOrders],
  )

  const varianceRows = useMemo(
    () =>
      productionOrders.map((order) => {
        const planned = order.plannedQty || 0
        const actual = order.producedQty || 0
        const variance = calculateVariance(planned, actual)
        return {
          orderNumber: order.orderNumber,
          productId: order.productId,
          line: order.line,
          plannedQty: planned,
          producedQty: actual,
          varianceQty: variance.diff,
          variancePct: variance.pct,
        }
      }),
    [productionOrders],
  )

  const yieldRows = useMemo(
    () =>
      productionOrders.map((order) => {
        const inputQty = order.rawMaterials?.reduce((sum, rm) => sum + rm.quantity, 0) || 0
        const outputQty = order.producedQty || 0
        const yieldPct = calculateYield(inputQty, outputQty)
        return {
          orderNumber: order.orderNumber,
          productId: order.productId,
          line: order.line,
          inputQty,
          outputQty,
          yieldPct,
        }
      }),
    [productionOrders],
  )

  const materialConsumptionRows = useMemo(
    () => {
      const rows = []
      productionOrders.forEach((order) => {
        order.rawMaterials?.forEach((rm) => {
          const item = inventory.find((i) => i.id === rm.itemId)
          rows.push({
            orderNumber: order.orderNumber,
            line: order.line,
            sku: item?.sku ?? rm.itemId,
            name: item?.name ?? rm.itemId,
            qty: rm.quantity,
            uom: rm.uom,
          })
        })
      })
      return rows
    },
    [inventory, productionOrders],
  )

  const bomCosting = useMemo(
    () =>
      BOMS.map((bom) => {
        let materialCost = 0
        let packagingCost = 0
        bom.materials.forEach((mat) => {
          const item = inventory.find((i) => i.id === mat.itemId)
          const baseCost =
            item?.estimatedCost ??
            (item?.type === 'Raw' ? 3 : item?.type === 'Packaging' ? 0.25 : 1)
          const componentCost = baseCost * mat.qty
          if (item?.type === 'Packaging') packagingCost += componentCost
          else materialCost += componentCost
        })
        const components = {
          material: materialCost,
          packaging: packagingCost,
          labor: materialCost * 0.12,
          machine: materialCost * 0.08,
          transport: materialCost * 0.05,
          wastage: materialCost * 0.03,
          overhead: materialCost * 0.15,
          qc: materialCost * 0.02,
        }
        const landed = calculateLandedCost(components, 1)
        return {
          bomId: bom.id,
          product: bom.product,
          components,
          landed,
        }
      }),
    [inventory],
  )

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
        <>
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

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Yield by order</h3>
                <span className="card-subtitle">Input vs output for each batch</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'productId', header: 'Product' },
                  { key: 'line', header: 'Line' },
                  { key: 'inputQty', header: 'Input qty (materials)' },
                  { key: 'outputQty', header: 'Output qty' },
                  {
                    key: 'yieldPct',
                    header: 'Yield (%)',
                    render: (v) => v.toFixed(1),
                  },
                ]}
                data={yieldRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Variance by order</h3>
                <span className="card-subtitle">Planned vs actual production</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'productId', header: 'Product' },
                  { key: 'line', header: 'Line' },
                  { key: 'plannedQty', header: 'Planned qty' },
                  { key: 'producedQty', header: 'Produced qty' },
                  {
                    key: 'varianceQty',
                    header: 'Variance (qty)',
                    render: (v) => v.toLocaleString(),
                  },
                  {
                    key: 'variancePct',
                    header: 'Variance (%)',
                    render: (v) => {
                      const tone = v >= 0 ? 'success' : 'danger'
                      const prefix = v >= 0 ? '+' : ''
                      return <Badge tone={tone}>{`${prefix}${v.toFixed(1)}%`}</Badge>
                    },
                  },
                ]}
                data={varianceRows}
              />
            </div>
          </section>

          <section className="grid grid-1">
            <div className="card">
              <div className="card-header">
                <h3>Material consumption by order</h3>
                <span className="card-subtitle">Raw and packaging usage across batches</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'line', header: 'Line' },
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Material' },
                  { key: 'qty', header: 'Qty consumed' },
                  { key: 'uom', header: 'UOM' },
                ]}
                data={materialConsumptionRows}
              />
            </div>
          </section>
        </>
      )}

      {activeTab === 'lines' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Line utilization</h3>
              <span className="card-subtitle">Planned, running, completed, and delayed</span>
            </div>
            <DataTable
              columns={[
                { key: 'line', header: 'Line' },
                { key: 'planned', header: 'Planned' },
                { key: 'running', header: 'Running' },
                { key: 'completed', header: 'Completed' },
                { key: 'delayed', header: 'Delayed' },
                {
                  key: 'utilization',
                  header: 'Utilization (%)',
                  render: (v) => v.toFixed(1),
                },
              ]}
              data={lineUtilizationRows}
            />
          </div>
          <div className="card">
            <div className="card-header">
              <h3>WIP orders</h3>
              <span className="card-subtitle">Orders in planned, running, or delayed status</span>
            </div>
            <DataTable
              columns={[
                { key: 'orderNumber', header: 'Order' },
                { key: 'productId', header: 'Product' },
                { key: 'line', header: 'Line' },
                { key: 'plannedQty', header: 'Planned qty' },
                { key: 'producedQty', header: 'Produced qty' },
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
              ]}
              data={wipOrders}
            />
          </div>
        </section>
      )}

      {activeTab === 'boms' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Bill of materials</h3>
              <span className="card-subtitle">Per-unit recipe for key finished goods</span>
            </div>
            {BOMS.map((bom) => (
              <div key={bom.id} className="bom-block">
                <h4>
                  {bom.id}: {bom.product}
                </h4>
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
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Landed cost breakdown</h3>
              <span className="card-subtitle">Per-unit cost index across BOMs</span>
            </div>
            <DataTable
              columns={[
                { key: 'bomId', header: 'BOM' },
                { key: 'product', header: 'Product' },
                {
                  key: 'material',
                  header: 'Material',
                  render: (v) => v.toFixed(2),
                },
                {
                  key: 'packaging',
                  header: 'Packaging',
                  render: (v) => v.toFixed(2),
                },
                {
                  key: 'labor',
                  header: 'Labor',
                  render: (v) => v.toFixed(2),
                },
                {
                  key: 'machine',
                  header: 'Machine',
                  render: (v) => v.toFixed(2),
                },
                {
                  key: 'overhead',
                  header: 'Overhead',
                  render: (v) => v.toFixed(2),
                },
                {
                  key: 'unit',
                  header: 'Total cost / unit',
                  render: (v) => v.toFixed(2),
                },
              ]}
              data={bomCosting.map((row) => ({
                bomId: row.bomId,
                product: row.product,
                material: row.components.material,
                packaging: row.components.packaging,
                labor: row.components.labor,
                machine: row.components.machine,
                overhead: row.components.overhead,
                unit: row.landed.unit,
              }))}
            />
          </div>
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
