import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'
import { generateForecast } from '../utils/permissions'

export function ReportsPage() {
  const { invoices, salesOrders, productionOrders, inventory } = useErp()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('summary')
  const [period, setPeriod] = useState('month')
  const [forecastHorizon, setForecastHorizon] = useState('next_month')

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

  const salesHistory = invoices.map((inv) => inv.amount).slice(0, 12)
  const revenueForecast = generateForecast(salesHistory)

  const salesTrends = [
    { month: 'Jan', revenue: 450000, target: 400000 },
    { month: 'Feb', revenue: 480000, target: 410000 },
    { month: 'Mar', revenue: 520000, target: 420000 },
    { month: 'Apr', revenue: metrics.revenue, target: 450000 },
    { month: 'Forecast', revenue: revenueForecast.next, target: 460000 },
  ]

  function handleExport(which) {
    showToast(`Generating ${which} report for ${period === 'month' ? 'this month' : 'this quarter'}.`, 'info')
  }

  return (
    <div className="page">
      <PageHeader
        title="Reports & analytics"
        subtitle="Executive-ready views spanning finance, production, working capital, and forecasts."
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

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'summary' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Management Summary
          </button>
          <button
            className={`tab ${activeTab === 'profitability' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('profitability')}
          >
            Profitability Analysis
          </button>
          <button
            className={`tab ${activeTab === 'sales_trends' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('sales_trends')}
          >
            Sales Trends
          </button>
          <button
            className={`tab ${activeTab === 'ops' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ops')}
          >
            Operational Efficiency
          </button>
          <button
            className={`tab ${activeTab === 'forecast' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            Forecasting
          </button>
        </div>
      </section>

      {activeTab === 'summary' && (
        <>
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
        </>
      )}

      {activeTab === 'profitability' && (
        <section className="grid grid-1">
          <div className="card">
              <div className="card-header">
                <h3>Detailed Profitability Analysis</h3>
                <span className="card-subtitle">By Product Family</span>
              </div>
            <DataTable
              columns={[
                { key: 'family', header: 'Product Family' },
                { key: 'revenue', header: 'Revenue ($)', render: (v) => v.toLocaleString() },
                { key: 'cogs', header: 'COGS ($)', render: (v) => v.toLocaleString() },
                { key: 'grossProfit', header: 'Gross Profit ($)', render: (v) => v.toLocaleString() },
                { key: 'margin', header: 'Margin (%)' },
              ]}
              data={[
                { family: 'Chili Sauces', revenue: 250000, cogs: 145000, grossProfit: 105000, margin: '42%' },
                { family: 'Marinades', revenue: 180000, cogs: 110000, grossProfit: 70000, margin: '39%' },
                { family: 'Cooking Sauces', revenue: 120000, cogs: 85000, grossProfit: 35000, margin: '29%' },
              ]}
            />
          </div>
        </section>
      )}

      {activeTab === 'sales_trends' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Sales Trends vs Target</h3>
              <span className="card-subtitle">Monthly Performance with simple forecast</span>
            </div>
            <DataTable
              columns={[
                { key: 'month', header: 'Month' },
                { key: 'revenue', header: 'Actual Revenue ($)', render: (v) => v.toLocaleString() },
                { key: 'target', header: 'Target Revenue ($)', render: (v) => v.toLocaleString() },
                {
                  key: 'variance',
                  header: 'Variance',
                  render: (_, row) => {
                    const varVal = ((row.revenue - row.target) / row.target) * 100
                    return (
                      <Badge tone={varVal >= 0 ? 'success' : 'danger'}>
                        {varVal >= 0 ? '+' : ''}
                        {varVal.toFixed(1)}%
                      </Badge>
                    )
                  },
                },
              ]}
              data={salesTrends}
            />
          </div>
        </section>
      )}

      {activeTab === 'ops' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Operational Efficiency Matrix</h3>
              <span className="card-subtitle">Plant Performance</span>
            </div>
            <DataTable
              columns={[
                { key: 'line', header: 'Production Line' },
                { key: 'availability', header: 'Availability (%)' },
                { key: 'performance', header: 'Performance (%)' },
                { key: 'quality', header: 'Quality (%)' },
                {
                  key: 'oee',
                  header: 'OEE (%)',
                  render: (_, row) => (
                    <strong>
                      {((row.availability * row.performance * row.quality) / 10000).toFixed(1)}%
                    </strong>
                  ),
                },
              ]}
              data={[
                { line: 'Sauce Line 1', availability: 92, performance: 88, quality: 99 },
                { line: 'Sauce Line 2', availability: 85, performance: 92, quality: 98 },
                { line: 'Export Line', availability: 95, performance: 90, quality: 99.5 },
              ]}
            />
          </div>
        </section>
      )}

      {activeTab === 'forecast' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Demand forecast simulation</h3>
              <span className="card-subtitle">Using simple average of recent periods</span>
            </div>
            <div className="card-header card-header-spaced">
              <select
                className="input input-select"
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(e.target.value)}
              >
                <option value="next_month">Next month</option>
                <option value="next_quarter">Next quarter</option>
              </select>
            </div>
            <ul className="summary-list">
              <li>
                <span>Forecasted revenue ({forecastHorizon === 'next_month' ? '1M' : '3M'})</span>
                <span>${revenueForecast.next.toLocaleString()}</span>
              </li>
              <li>
                <span>Trend direction</span>
                <span>
                  {revenueForecast.trend === 'up'
                    ? 'Upward vs prior period'
                    : revenueForecast.trend === 'down'
                      ? 'Downward vs prior period'
                      : 'Flat vs prior period'}
                </span>
              </li>
              <li>
                <span>Forecast vs current run-rate</span>
                <span>
                  {metrics.revenue
                    ? `${((revenueForecast.next / metrics.revenue - 1) * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Profitability breakdown (simulated)</h3>
              <span className="card-subtitle">Per product family</span>
            </div>
            <DataTable
              columns={[
                { key: 'family', header: 'Product Family' },
                { key: 'forecastRevenue', header: 'Forecast Revenue ($)', render: (v) => v.toLocaleString() },
                { key: 'forecastGrossProfit', header: 'Forecast Gross Profit ($)', render: (v) => v.toLocaleString() },
                { key: 'margin', header: 'Margin (%)' },
              ]}
              data={[
                {
                  family: 'Chili Sauces',
                  forecastRevenue: Math.round(revenueForecast.next * 0.4),
                  forecastGrossProfit: Math.round(revenueForecast.next * 0.4 * 0.42),
                  margin: '42%',
                },
                {
                  family: 'Marinades',
                  forecastRevenue: Math.round(revenueForecast.next * 0.35),
                  forecastGrossProfit: Math.round(revenueForecast.next * 0.35 * 0.39),
                  margin: '39%',
                },
                {
                  family: 'Cooking Sauces',
                  forecastRevenue: Math.round(revenueForecast.next * 0.25),
                  forecastGrossProfit: Math.round(revenueForecast.next * 0.25 * 0.29),
                  margin: '29%',
                },
              ]}
            />
          </div>
        </section>
      )}
    </div>
  )
}
