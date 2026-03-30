import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { RevenueTrendChart, ProductSplitChart } from '../components/ChartCard'
import { StatCard } from '../components/StatCard'
import { useErp } from '../context/ErpContext'

export function DashboardPage() {
  const { invoices, purchaseOrders, salesOrders, inventory, productionOrders, notifications } =
    useErp()
  const navigate = useNavigate()

  const kpis = useMemo(() => {
    const totalRevenue = invoices
      .filter((inv) => inv.status !== 'Cancelled')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const pendingPo = purchaseOrders.filter(
      (po) => po.status === 'Open' || po.status === 'Approved',
    ).length

    const lowStock = inventory.filter((i) => i.onHand <= i.reorderLevel).length

    const runningOrders = productionOrders.filter((po) => po.status === 'Running').length
    const delayedOrders = productionOrders.filter((po) => po.status === 'Delayed').length

    const salesThisMonth = salesOrders.reduce((sum, so) => sum + so.amount, 0)
    const openApprovals = purchaseOrders.filter((po) => po.status === 'Open').length

    const avgEfficiency =
      productionOrders.filter((p) => p.efficiency != null).reduce((sum, p) => sum + p.efficiency, 0) /
        Math.max(1, productionOrders.filter((p) => p.efficiency != null).length) || 0

    return {
      totalRevenue,
      pendingPo,
      lowStock,
      runningOrders,
      delayedOrders,
      salesThisMonth,
      openApprovals,
      avgEfficiency,
    }
  }, [invoices, purchaseOrders, inventory, productionOrders, salesOrders])

  const revenueTrend = useMemo(
    () => [
      { label: 'Nov', value: Math.round(kpis.totalRevenue * 0.7) },
      { label: 'Dec', value: Math.round(kpis.totalRevenue * 0.8) },
      { label: 'Jan', value: Math.round(kpis.totalRevenue * 0.9) },
      { label: 'Feb', value: Math.round(kpis.totalRevenue * 0.95) },
      { label: 'Mar', value: Math.round(kpis.totalRevenue * 1.02) },
      { label: 'Apr', value: Math.round(kpis.totalRevenue) },
    ],
    [kpis.totalRevenue],
  )

  const productMix = useMemo(() => {
    const finished = inventory.filter((i) => i.type === 'Finished')
    return finished.map((item) => ({
      label: item.name,
      value: item.onHand,
    }))
  }, [inventory])

  const recentInvoices = invoices.slice(0, 5)
  const recentPurchaseOrders = purchaseOrders.slice(0, 5)
  const recentSalesOrders = salesOrders.slice(0, 5)

  return (
    <div className="page">
      <PageHeader
        title="Executive dashboard"
        subtitle="Unified snapshot of revenue, demand, and plant health for Foods Pacific."
        actions={
          <>
            <button type="button" className="button ghost" onClick={() => navigate('/reports')}>
              View management reports
            </button>
            <button type="button" className="button primary" onClick={() => navigate('/sales')}>
              Capture sales order
            </button>
          </>
        }
      />

      <section className="grid grid-3">
        <StatCard
          label="Total invoiced revenue"
          value={`$${kpis.totalRevenue.toLocaleString()}`}
          trend="+8.4% vs last month"
          tone="primary"
        />
        <StatCard
          label="Sales this month"
          value={`$${kpis.salesThisMonth.toLocaleString()}`}
          trend="Export mix trending up"
          tone="accent"
        />
        <StatCard
          label="Production efficiency"
          value={`${kpis.avgEfficiency.toFixed(1)}%`}
          trend={`${kpis.runningOrders} running / ${kpis.delayedOrders} delayed orders`}
          tone="success"
        />
        <StatCard
          label="Pending purchase orders"
          value={kpis.pendingPo}
          trend={`${kpis.openApprovals} approvals waiting`}
          tone="warning"
        />
        <StatCard
          label="Low stock alerts"
          value={kpis.lowStock}
          trend="Auto-replenishment suggestions active"
          tone="danger"
        />
        <StatCard
          label="Unread notifications"
          value={notifications.length}
          trend="Security, production, and finance updates"
          tone="neutral"
        />
      </section>

      <section className="grid grid-2">
        <RevenueTrendChart data={revenueTrend} />
        <ProductSplitChart data={productMix} />
      </section>

      <section className="grid grid-3">
        <div className="card">
          <div className="card-header">
            <h3>Recent invoices</h3>
            <span className="card-subtitle">Finance</span>
          </div>
          <DataTable
            columns={[
              { key: 'invoiceNumber', header: 'Invoice' },
              { key: 'customer', header: 'Customer' },
              {
                key: 'amount',
                header: 'Amount',
                render: (value, row) => `${row.currency} ${value.toLocaleString()}`,
              },
              { key: 'dueDate', header: 'Due' },
              {
                key: 'status',
                header: 'Status',
                render: (value) => (
                  <Badge
                    tone={
                      value === 'Paid'
                        ? 'success'
                        : value === 'Partially Paid'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {value}
                  </Badge>
                ),
              },
            ]}
            data={recentInvoices}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent purchase orders</h3>
            <span className="card-subtitle">Procurement</span>
          </div>
          <DataTable
            columns={[
              { key: 'poNumber', header: 'PO' },
              { key: 'supplierName', header: 'Supplier' },
              { key: 'expectedDate', header: 'Expected' },
              {
                key: 'status',
                header: 'Status',
                render: (value) => (
                  <Badge
                    tone={
                      value === 'Received'
                        ? 'success'
                        : value === 'Cancelled'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {value}
                  </Badge>
                ),
              },
            ]}
            data={recentPurchaseOrders}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent sales orders</h3>
            <span className="card-subtitle">Sales & Distribution</span>
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
                render: (value) => <Badge tone="neutral">{value}</Badge>,
              },
            ]}
            data={recentSalesOrders}
          />
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Live notifications</h3>
            <span className="card-subtitle">Across ERP</span>
          </div>
          <ul className="notifications-list">
            {notifications.map((n) => (
              <li key={n.id} className="notifications-item">
                <Badge tone="neutral">{n.type}</Badge>
                <span className="notifications-message">{n.message}</span>
                <span className="notifications-time">{n.timeAgo}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Plant health summary</h3>
          </div>
          <ul className="summary-list">
            <li>
              <span>Lines running</span>
              <span>
                {kpis.runningOrders} of {productionOrders.length} orders in progress
              </span>
            </li>
            <li>
              <span>Delayed orders</span>
              <span>{kpis.delayedOrders} flagged for review</span>
            </li>
            <li>
              <span>Low stock items</span>
              <span>{kpis.lowStock} materials below reorder level</span>
            </li>
            <li>
              <span>Finance attention</span>
              <span>
                {invoices.filter((i) => i.status === 'Unpaid').length} unpaid /{' '}
                {invoices.filter((i) => i.status === 'Partially Paid').length} partially paid
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
