import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'

export function ReportsPage() {
  const { invoices, salesOrders, productionOrders, inventory } = useErp()
  const { showToast } = useToast()

  const [period, setPeriod] = useState('month')

  const metrics = useMemo(() => {
    const revenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const costOfGoods = revenue * 0.62
    const grossProfit = revenue - costOfGoods
    const margin = revenue ? (grossProfit / revenue) * 100 : 0

    const turnover =
      inventory.filter((i) => i.type === 'Finished').reduce((sum, i) => sum + i.onHand, 0) || 1

    const completedOrders = productionOrders.filter((p) => p.status === 'Completed').length
    const onTimeOrders = productionOrders.filter(
      (p) => p.status === 'Completed' && (p.efficiency ?? 0) >= 90,
    ).length

    return {
      revenue,
      grossProfit,
      margin,
      turnover,
      completedOrders,
      onTimeOrders,
      orderCount: salesOrders.length,
    }
  }, [invoices, inventory, productionOrders, salesOrders])

  function handleExport(which) {
    showToast(`Generating ${which} report for ${period === 'month' ? 'this month' : 'this quarter'}.`, 'info')
  }

  return (
    <div className="page">
      <PageHeader
        title="Reports & analytics"
        subtitle="Executive-ready views spanning finance, production, and working capital."
        actions={
          <>
            <select
              className="input input-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
            </select>
            <button type="button" className="button primary" onClick={() => handleExport('management')}>
              Export management pack
            </button>
          </>
        }
      />

      <section className="grid grid-4">
        <StatCard
          label="Revenue"
          value={`$${metrics.revenue.toLocaleString()}`}
          trend="Consolidated across segments"
          tone="primary"
        />
        <StatCard
          label="Gross profit"
          value={`$${metrics.grossProfit.toLocaleString()}`}
          trend={`Margin ${metrics.margin.toFixed(1)}%`}
          tone="success"
        />
        <StatCard
          label="Inventory turnover index"
          value={metrics.turnover.toLocaleString()}
          trend="Based on finished goods on hand"
          tone="neutral"
        />
        <StatCard
          label="On-time production"
          value={`${metrics.onTimeOrders}/${metrics.completedOrders}`}
          trend="Orders completed at or above planned efficiency"
          tone="accent"
        />
      </section>

      <section className="grid grid-3">
        <div className="card">
          <div className="card-header">
            <h3>Budget vs forecast</h3>
            <span className="card-subtitle">Finance</span>
          </div>
          <ul className="summary-list">
            <li>
              <span>Revenue</span>
              <span>Tracking slightly ahead of annual budget.</span>
            </li>
            <li>
              <span>Gross margin</span>
              <span>Mix uplift from premium export SKUs.</span>
            </li>
            <li>
              <span>Operating expenses</span>
              <span>Stable despite additional production shifts.</span>
            </li>
          </ul>
          <button
            type="button"
            className="button ghost block"
            onClick={() => handleExport('finance')}
          >
            Export finance summary
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Profitability by product</h3>
            <span className="card-subtitle">Product and channel lens</span>
          </div>
          <ul className="summary-list">
            <li>
              <span>Premium Chili Sauce 500ml</span>
              <span>Flagship, high-margin SKU with strong retail pull.</span>
            </li>
            <li>
              <span>Herb & Garlic Marinade 500ml</span>
              <span>Balanced margin with high volume in food service.</span>
            </li>
            <li>
              <span>Teriyaki Cooking Sauce 1L</span>
              <span>Growing in export markets with promotional support.</span>
            </li>
          </ul>
          <button
            type="button"
            className="button ghost block"
            onClick={() => handleExport('product')}
          >
            Export product view
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Manufacturing performance</h3>
            <span className="card-subtitle">Operations</span>
          </div>
          <ul className="summary-list">
            <li>
              <span>Yield and scrap</span>
              <span>Within tolerance across main lines.</span>
            </li>
            <li>
              <span>Changeover time</span>
              <span>Improved on export line after SMED exercise.</span>
            </li>
            <li>
              <span>Planned vs actual hours</span>
              <span>Aligned for core product families.</span>
            </li>
          </ul>
          <button
            type="button"
            className="button ghost block"
            onClick={() => handleExport('operations')}
          >
            Export operations view
          </button>
        </div>
      </section>
    </div>
  )
}

