import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { DonutChartCard, ProductSplitChart, RevenueTrendChart } from '../components/ChartCard'
import { ExportButton } from '../components/ExportButton'
import { PageHeader } from '../components/PageHeader'
import { ReportCard } from '../components/ReportCard'
import { ReportFilterBar } from '../components/ReportFilterBar'
import { StatCard } from '../components/StatCard'
import { DrilldownModal } from '../components/DrilldownModal'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'
import { generateForecast } from '../utils/permissions'
import { calculateVariance, calculateYield, generateReports } from '../utils/metrics'

export function ReportsPage() {
  const {
    invoices,
    salesOrders,
    productionOrders,
    inventory,
    auditLogs,
    suppliers,
    purchaseOrders,
    payments,
  } = useErp()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('summary')
  const [period, setPeriod] = useState('month')
  const [forecastHorizon, setForecastHorizon] = useState('next_month')
  const [reportPeriod, setReportPeriod] = useState('mtd')
  const [reportYear, setReportYear] = useState('2026')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownContext, setDrilldownContext] = useState(null)

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

  const reportMetrics = useMemo(
    () =>
      generateReports({
        invoices,
        productionOrders,
        inventory,
        salesOrders,
      }),
    [inventory, invoices, productionOrders, salesOrders],
  )

  const inventoryValuationRows = useMemo(() => {
    return inventory.map((item) => {
      const baseCost =
        item.type === 'Raw' ? 3 : item.type === 'Packaging' ? 0.25 : item.type === 'Finished' ? 4.5 : 1
      const unitCost = item.estimatedCost ?? baseCost
      const value = unitCost * item.onHand
      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        warehouse: item.warehouse,
        onHand: item.onHand,
        uom: item.uom,
        unitCost,
        value,
      }
    })
  }, [inventory])

  const stockAgingRows = useMemo(() => {
    const now = new Date()
    return inventory
      .filter((item) => item.batch && item.expiryDate)
      .map((item) => {
        const exp = new Date(item.expiryDate)
        const days = Math.round((exp - now) / (1000 * 60 * 60 * 24))
        let band = '60+ days'
        if (days <= 30) band = '0–30 days'
        else if (days <= 60) band = '30–60 days'
        return {
          sku: item.sku,
          name: item.name,
          batch: item.batch,
          expiryDate: item.expiryDate,
          daysToExpiry: days,
          band,
          onHand: item.onHand,
          uom: item.uom,
        }
      })
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

  const warehouseDistributionRows = useMemo(() => {
    const map = {}
    inventory.forEach((item) => {
      if (!map[item.warehouse]) {
        map[item.warehouse] = { warehouse: item.warehouse, units: 0 }
      }
      map[item.warehouse].units += item.onHand
    })
    return Object.values(map)
  }, [inventory])

  const lowStockRows = useMemo(
    () => inventory.filter((i) => i.onHand <= i.reorderLevel),
    [inventory],
  )

  const soonToExpireRows = useMemo(
    () => stockAgingRows.filter((row) => row.daysToExpiry <= 60),
    [stockAgingRows],
  )

  const supplierOptions = useMemo(
    () => [
      { value: 'all', label: 'All suppliers' },
      ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ],
    [suppliers],
  )

  const warehouseOptions = useMemo(
    () => [
      { value: 'all', label: 'All warehouses' },
      ...Array.from(new Set(inventory.map((i) => i.warehouse))).map((w) => ({
        value: w,
        label: w,
      })),
    ],
    [inventory],
  )

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'All categories' },
      ...Array.from(new Set(inventory.map((i) => i.category))).map((c) => ({
        value: c,
        label: c,
      })),
    ],
    [inventory],
  )

  const filteredInventoryValuation = useMemo(
    () =>
      inventoryValuationRows.filter((row) => {
        if (categoryFilter !== 'all' && row.category !== categoryFilter) return false
        if (warehouseFilter !== 'all' && row.warehouse !== warehouseFilter) return false
        return true
      }),
    [categoryFilter, inventoryValuationRows, warehouseFilter],
  )

  const supplierInboundRows = useMemo(() => {
    return purchaseOrders
      .filter((po) => supplierFilter === 'all' || po.supplierId === supplierFilter)
      .map((po) => {
        const supplier = suppliers.find((s) => s.id === po.supplierId)
        return {
          poNumber: po.poNumber,
          supplier: supplier?.name ?? po.supplierId,
          orderDate: po.orderDate,
          expectedDate: po.expectedDate,
          status: po.status,
          currency: po.currency,
          amount: po.amount,
        }
      })
  }, [purchaseOrders, supplierFilter, suppliers])

  const productionVarianceRows = useMemo(
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

  const materialConsumptionRows = useMemo(() => {
    const map = {}
    productionOrders.forEach((order) => {
      order.rawMaterials?.forEach((rm) => {
        if (!map[rm.itemId]) {
          map[rm.itemId] = { itemId: rm.itemId, qty: 0, uom: rm.uom }
        }
        map[rm.itemId].qty += rm.quantity
      })
    })
    return Object.values(map).map((row) => {
      const item = inventory.find((i) => i.id === row.itemId)
      return {
        sku: item?.sku ?? row.itemId,
        name: item?.name ?? row.itemId,
        qty: row.qty,
        uom: row.uom,
      }
    })
  }, [inventory, productionOrders])

  const yieldRows = useMemo(() => {
    return productionOrders.map((order) => {
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
    })
  }, [productionOrders])

  const machineUtilizationRows = useMemo(() => {
    const map = {}
    productionOrders.forEach((order) => {
      if (!map[order.line]) {
        map[order.line] = { line: order.line, planned: 0, running: 0, completed: 0 }
      }
      map[order.line].planned += order.status === 'Planned' ? 1 : 0
      map[order.line].running += order.status === 'Running' ? 1 : 0
      map[order.line].completed += order.status === 'Completed' ? 1 : 0
    })
    return Object.values(map).map((row) => {
      const total = row.planned + row.running + row.completed || 1
      const utilization = ((row.running + row.completed) / total) * 100
      return {
        ...row,
        utilization,
      }
    })
  }, [productionOrders])

  const batchCompletionRows = useMemo(
    () =>
      productionOrders.map((order) => ({
        orderNumber: order.orderNumber,
        productId: order.productId,
        line: order.line,
        plannedQty: order.plannedQty,
        producedQty: order.producedQty,
        status: order.status,
        startDate: order.startDate,
        endDate: order.endDate,
      })),
    [productionOrders],
  )

  const topProductsRows = useMemo(() => {
    const map = {}
    salesOrders.forEach((so) => {
      so.items?.forEach((line) => {
        if (!map[line.itemId]) {
          map[line.itemId] = { itemId: line.itemId, qty: 0 }
        }
        map[line.itemId].qty += line.quantity
      })
    })
    return Object.values(map)
      .map((row) => {
        const item = inventory.find((i) => i.id === row.itemId)
        return {
          sku: item?.sku ?? row.itemId,
          name: item?.name ?? row.itemId,
          qty: row.qty,
        }
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [inventory, salesOrders])

  const customerSummaryRows = useMemo(() => {
    const map = {}
    salesOrders.forEach((so) => {
      if (!map[so.customer]) {
        map[so.customer] = { customer: so.customer, orders: 0, totalAmount: 0 }
      }
      map[so.customer].orders += 1
      map[so.customer].totalAmount += so.amount
    })
    return Object.values(map)
  }, [salesOrders])

  const regionalSalesRows = useMemo(() => {
    const entries = Object.entries(reportMetrics.salesByRegion || {})
    return entries.map(([region, value]) => ({
      region,
      value,
    }))
  }, [reportMetrics])

  const invoiceCollectionRows = useMemo(() => {
    return invoices.map((inv) => {
      const invPayments = payments.filter((p) => p.invoiceId === inv.id && p.status === 'Posted')
      const paid = invPayments.reduce((sum, p) => sum + p.amount, 0)
      const balance = inv.amount - paid
      return {
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer,
        issueDate: inv.issueDate,
        amount: inv.amount,
        paid,
        balance,
        currency: inv.currency,
        status: inv.status,
      }
    })
  }, [invoices, payments])

  const quoteStats = useMemo(() => {
    const quoted = salesOrders.filter((so) => so.status === 'Quoted').length
    const converted = salesOrders.filter(
      (so) => so.status !== 'Quoted' && so.status !== 'Cancelled',
    ).length
    const total = quoted + converted || 1
    const conversionRate = (converted / total) * 100
    return {
      quoted,
      converted,
      conversionRate,
    }
  }, [salesOrders])

  function handleExport(which) {
    showToast(
      `Generating ${which} report for ${
        period === 'month' ? 'this month' : 'this quarter'
      }. Filters applied: ${reportPeriod.toUpperCase()} FY ${reportYear}.`,
      'info',
    )
  }

  function handleExtraFilterChange(key, value) {
    if (key === 'category') setCategoryFilter(value)
    if (key === 'warehouse') setWarehouseFilter(value)
    if (key === 'supplier') setSupplierFilter(value)
  }

  function openDrilldown(context) {
    setDrilldownContext(context)
    setDrilldownOpen(true)
  }

  function closeDrilldown() {
    setDrilldownOpen(false)
    setDrilldownContext(null)
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
            Executive Summary
          </button>
          <button
            className={`tab ${activeTab === 'profitability' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('profitability')}
          >
            Profitability Analysis
          </button>
          <button
            className={`tab ${activeTab === 'inventory' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Reports
          </button>
          <button
            className={`tab ${activeTab === 'production' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            Production Reports
          </button>
          <button
            className={`tab ${activeTab === 'sales' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Reports
          </button>
          <button
            className={`tab ${activeTab === 'ops' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ops')}
          >
            Operational Scorecards
          </button>
          <button
            className={`tab ${activeTab === 'forecast' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            Forecast vs Actual
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
              <ExportButton label="Export finance summary" onClick={() => handleExport('finance')} />
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
              <ExportButton label="Export product view" onClick={() => handleExport('product')} />
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
              <ExportButton label="Export operations view" onClick={() => handleExport('operations')} />
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

      {activeTab === 'inventory' && (
        <>
          <ReportFilterBar
            period={reportPeriod}
            onPeriodChange={setReportPeriod}
            year={reportYear}
            onYearChange={setReportYear}
            extraFilters={[
              { key: 'category', value: categoryFilter, options: categoryOptions },
              { key: 'warehouse', value: warehouseFilter, options: warehouseOptions },
              { key: 'supplier', value: supplierFilter, options: supplierOptions },
            ]}
            onExtraFilterChange={handleExtraFilterChange}
            onExport={() => handleExport('inventory')}
            onPrint={() => showToast('Inventory reports print simulated.', 'info')}
          />

          <section className="grid grid-3">
            <ReportCard
              label="Inventory value (simulated)"
              value={`$${filteredInventoryValuation
                .reduce((sum, row) => sum + row.value, 0)
                .toLocaleString()}`}
              sublabel="Based on standard cost per SKU"
              tone="neutral"
            />
            <ReportCard
              label="SKUs at reorder level"
              value={lowStockRows.length}
              sublabel="Reorder alert report"
              tone={lowStockRows.length ? 'warning' : 'success'}
            />
            <ReportCard
              label="Batches expiring ≤60 days"
              value={soonToExpireRows.length}
              sublabel="Batch expiry risk"
              tone={soonToExpireRows.length ? 'danger' : 'success'}
            />
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Stock valuation report</h3>
                <span className="card-subtitle">By SKU, warehouse, and category</span>
              </div>
              <DataTable
                columns={[
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Item' },
                  { key: 'category', header: 'Category' },
                  { key: 'warehouse', header: 'Warehouse' },
                  { key: 'onHand', header: 'On hand' },
                  {
                    key: 'unitCost',
                    header: 'Unit cost (index)',
                    render: (v) => v.toFixed(2),
                  },
                  {
                    key: 'value',
                    header: 'Value (index)',
                    render: (v) => v.toLocaleString(),
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (_, row) => (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          openDrilldown({
                            type: 'inventorySku',
                            row,
                          })
                        }
                      >
                        View drilldown
                      </button>
                    ),
                  },
                ]}
                data={filteredInventoryValuation}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Warehouse stock distribution</h3>
                <span className="card-subtitle">Units on hand by warehouse</span>
              </div>
              <DonutChartCard
                title="Warehouse distribution"
                subtitle="Proportion of units on hand"
                data={warehouseDistributionRows.map((row) => ({
                  label: row.warehouse,
                  value: row.units,
                }))}
              />
              <DataTable
                columns={[
                  { key: 'warehouse', header: 'Warehouse' },
                  { key: 'units', header: 'Units on hand', render: (v) => v.toLocaleString() },
                ]}
                data={warehouseDistributionRows}
              />
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Stock aging report</h3>
                <span className="card-subtitle">By batch and remaining shelf life</span>
              </div>
              <DataTable
                columns={[
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Item' },
                  { key: 'batch', header: 'Batch' },
                  { key: 'expiryDate', header: 'Expiry date' },
                  { key: 'band', header: 'Aging band' },
                  { key: 'daysToExpiry', header: 'Days to expiry' },
                  { key: 'onHand', header: 'Qty' },
                ]}
                data={stockAgingRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Fast/slow/dead stock report</h3>
                <span className="card-subtitle">Based on recent stock adjustments</span>
              </div>
              <DataTable
                columns={[
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Item' },
                  { key: 'category', header: 'Category' },
                  { key: 'warehouse', header: 'Warehouse' },
                  { key: 'moves', header: 'Movement count' },
                  {
                    key: 'classification',
                    header: 'Classification',
                    render: (_, row) => {
                      const fast = movementSpeed.fastMoving.find((i) => i.id === row.id)
                      const dead = movementSpeed.deadStock.find((i) => i.id === row.id)
                      const label = dead ? 'Dead' : fast ? 'Fast' : 'Slow'
                      const tone = dead ? 'danger' : fast ? 'success' : 'warning'
                      return <Badge tone={tone}>{label}</Badge>
                    },
                  },
                ]}
                data={[
                  ...movementSpeed.fastMoving,
                  ...movementSpeed.slowMoving,
                  ...movementSpeed.deadStock,
                ]}
              />
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Reorder alert report</h3>
                <span className="card-subtitle">Items at or below reorder level</span>
              </div>
              <DataTable
                columns={[
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Item' },
                  { key: 'warehouse', header: 'Warehouse' },
                  { key: 'onHand', header: 'On hand' },
                  { key: 'reorderLevel', header: 'Reorder level' },
                ]}
                data={lowStockRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Inbound stock by supplier</h3>
                <span className="card-subtitle">Purchase orders driving replenishment</span>
              </div>
              <DataTable
                columns={[
                  { key: 'poNumber', header: 'PO' },
                  { key: 'supplier', header: 'Supplier' },
                  { key: 'orderDate', header: 'Order date' },
                  { key: 'expectedDate', header: 'Expected date' },
                  { key: 'status', header: 'Status' },
                  {
                    key: 'amount',
                    header: 'Amount',
                    render: (v, row) => `${row.currency} ${v.toLocaleString()}`,
                  },
                ]}
                data={supplierInboundRows}
              />
            </div>
          </section>
        </>
      )}

      {activeTab === 'production' && (
        <>
          <ReportFilterBar
            period={reportPeriod}
            onPeriodChange={setReportPeriod}
            year={reportYear}
            onYearChange={setReportYear}
            onExport={() => handleExport('production')}
            onPrint={() => showToast('Production reports print simulated.', 'info')}
          />

          <section className="grid grid-4">
            <ReportCard
              label="Completed batches"
              value={productionOrders.filter((p) => p.status === 'Completed').length}
              sublabel="Production performance"
              tone="success"
            />
            <ReportCard
              label="Running batches"
              value={productionOrders.filter((p) => p.status === 'Running').length}
              sublabel="In progress"
              tone="accent"
            />
            <ReportCard
              label="Delayed batches"
              value={productionOrders.filter((p) => p.status === 'Delayed').length}
              sublabel="Variance risk"
              tone="danger"
            />
            <ReportCard
              label="Average yield"
              value={`${(
                yieldRows.reduce((sum, row) => sum + (row.yieldPct || 0), 0) /
                Math.max(1, yieldRows.length)
              ).toFixed(1)}%`}
              sublabel="Across recent orders"
              tone="neutral"
            />
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Production performance report</h3>
                <span className="card-subtitle">Planned vs actual output and efficiency</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'productId', header: 'Product' },
                  { key: 'line', header: 'Line' },
                  { key: 'plannedQty', header: 'Planned qty' },
                  { key: 'producedQty', header: 'Produced qty' },
                  {
                    key: 'efficiency',
                    header: 'Eff. (%)',
                    render: (_, row) => {
                      const planned = row.plannedQty || 0
                      const actual = row.producedQty || 0
                      const eff = planned ? (actual / planned) * 100 : 0
                      return eff ? eff.toFixed(1) : '—'
                    },
                  },
                ]}
                data={batchCompletionRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Production variance report</h3>
                <span className="card-subtitle">Qty and percentage variance by batch</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'productId', header: 'Product' },
                  { key: 'line', header: 'Line' },
                  { key: 'plannedQty', header: 'Planned' },
                  { key: 'producedQty', header: 'Actual' },
                  {
                    key: 'varianceQty',
                    header: 'Variance (qty)',
                    render: (v) => v.toLocaleString(),
                  },
                  {
                    key: 'variancePct',
                    header: 'Variance (%)',
                    render: (v) => (
                      <Badge tone={v >= 0 ? 'success' : 'danger'}>
                        {v >= 0 ? '+' : ''}
                        {v.toFixed(1)}%
                      </Badge>
                    ),
                  },
                ]}
                data={productionVarianceRows}
              />
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Material consumption report</h3>
                <span className="card-subtitle">Aggregated by raw and packaging material</span>
              </div>
              <DataTable
                columns={[
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Material' },
                  { key: 'qty', header: 'Qty consumed' },
                  { key: 'uom', header: 'UOM' },
                ]}
                data={materialConsumptionRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Wastage report</h3>
                <span className="card-subtitle">Variance between planned and produced</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'productId', header: 'Product' },
                  { key: 'plannedQty', header: 'Planned qty' },
                  { key: 'producedQty', header: 'Produced qty' },
                  {
                    key: 'wastage',
                    header: 'Estimated wastage',
                    render: (_, row) => {
                      const wastage = Math.max(0, (row.plannedQty || 0) - (row.producedQty || 0))
                      return wastage.toLocaleString()
                    },
                  },
                ]}
                data={batchCompletionRows}
              />
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Machine utilization report</h3>
                <span className="card-subtitle">By production line</span>
              </div>
              <DataTable
                columns={[
                  { key: 'line', header: 'Line' },
                  { key: 'planned', header: 'Planned batches' },
                  { key: 'running', header: 'Running' },
                  { key: 'completed', header: 'Completed' },
                  {
                    key: 'utilization',
                    header: 'Utilization (%)',
                    render: (v) => v.toFixed(1),
                  },
                ]}
                data={machineUtilizationRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Yield report</h3>
                <span className="card-subtitle">Input vs output by batch</span>
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
          </section>

          <section className="grid grid-1">
            <div className="card">
              <div className="card-header">
                <h3>Batch completion report</h3>
                <span className="card-subtitle">End-to-end view of production batches</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'productId', header: 'Product' },
                  { key: 'line', header: 'Line' },
                  { key: 'plannedQty', header: 'Planned qty' },
                  { key: 'producedQty', header: 'Produced qty' },
                  { key: 'status', header: 'Status' },
                  { key: 'startDate', header: 'Start date' },
                  { key: 'endDate', header: 'End date' },
                ]}
                data={batchCompletionRows}
              />
            </div>
          </section>
        </>
      )}

      {activeTab === 'sales' && (
        <>
          <ReportFilterBar
            period={reportPeriod}
            onPeriodChange={setReportPeriod}
            year={reportYear}
            onYearChange={setReportYear}
            onExport={() => handleExport('sales')}
            onPrint={() => showToast('Sales reports print simulated.', 'info')}
          />

          <section className="grid grid-4">
            <ReportCard
              label="Sales orders"
              value={salesOrders.length}
              sublabel="Customer order summary"
              tone="neutral"
            />
            <ReportCard
              label="Invoiced revenue"
              value={`$${metrics.revenue.toLocaleString()}`}
              sublabel="Invoice collection base"
              tone="primary"
            />
            <ReportCard
              label="Quoted vs converted"
              value={`${quoteStats.converted}/${quoteStats.quoted || 1}`}
              sublabel={`Conversion ${(quoteStats.conversionRate || 0).toFixed(1)}%`}
              tone="accent"
            />
            <ReportCard
              label="Regions active"
              value={Object.keys(reportMetrics.salesByRegion || {}).length}
              sublabel="Regional sales coverage"
              tone="neutral"
            />
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Sales trend report</h3>
                <span className="card-subtitle">Actual vs target by period</span>
              </div>
              <RevenueTrendChart
                data={salesTrends.map((row) => ({ label: row.month, value: row.revenue }))}
              />
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
            <div className="card">
              <div className="card-header">
                <h3>Top-selling products</h3>
                <span className="card-subtitle">Aggregated across all regions</span>
              </div>
              <ProductSplitChart
                data={topProductsRows.map((row) => ({ label: row.name, value: row.qty }))}
              />
              <DataTable
                columns={[
                  { key: 'sku', header: 'SKU' },
                  { key: 'name', header: 'Product' },
                  { key: 'qty', header: 'Units sold', render: (v) => v.toLocaleString() },
                ]}
                data={topProductsRows}
              />
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Customer order summary</h3>
                <span className="card-subtitle">Orders and value by customer</span>
              </div>
              <DataTable
                columns={[
                  { key: 'customer', header: 'Customer' },
                  { key: 'orders', header: 'Orders' },
                  {
                    key: 'totalAmount',
                    header: 'Total amount',
                    render: (v) => v.toLocaleString(),
                  },
                ]}
                data={customerSummaryRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Dispatch performance report</h3>
                <span className="card-subtitle">Fulfilment status by order</span>
              </div>
              <DataTable
                columns={[
                  { key: 'orderNumber', header: 'Order' },
                  { key: 'customer', header: 'Customer' },
                  { key: 'orderDate', header: 'Order date' },
                  { key: 'deliveryDate', header: 'Delivery date' },
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
                ]}
                data={salesOrders}
              />
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Invoice collection report</h3>
                <span className="card-subtitle">Status of AR by invoice</span>
              </div>
              <DataTable
                columns={[
                  { key: 'invoiceNumber', header: 'Invoice' },
                  { key: 'customer', header: 'Customer' },
                  { key: 'issueDate', header: 'Issue date' },
                  {
                    key: 'amount',
                    header: 'Amount',
                    render: (v, row) => `${row.currency} ${v.toLocaleString()}`,
                  },
                  {
                    key: 'paid',
                    header: 'Paid',
                    render: (v, row) => `${row.currency} ${v.toLocaleString()}`,
                  },
                  {
                    key: 'balance',
                    header: 'Outstanding',
                    render: (v, row) => `${row.currency} ${v.toLocaleString()}`,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (value) => (
                      <Badge
                        tone={
                          value === 'Paid' ? 'success' : value === 'Partially Paid' ? 'warning' : 'danger'
                        }
                      >
                        {value}
                      </Badge>
                    ),
                  },
                ]}
                data={invoiceCollectionRows}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>Regional sales report</h3>
                <span className="card-subtitle">Sales by geographic region</span>
              </div>
              <DonutChartCard
                title="Regional mix"
                subtitle="Share of sales value"
                data={regionalSalesRows.map((row) => ({
                  label: row.region,
                  value: row.value,
                }))}
              />
              <DataTable
                columns={[
                  { key: 'region', header: 'Region' },
                  {
                    key: 'value',
                    header: 'Sales value',
                    render: (v) => v.toLocaleString(),
                  },
                ]}
                data={regionalSalesRows}
              />
            </div>
          </section>
        </>
      )}

      <DrilldownModal
        open={drilldownOpen}
        onClose={closeDrilldown}
        title={
          drilldownContext?.type === 'inventorySku'
            ? drilldownContext.row.name
            : 'Report drilldown'
        }
        subtitle={
          drilldownContext?.type === 'inventorySku'
            ? `${drilldownContext.row.sku} • ${drilldownContext.row.warehouse}`
            : null
        }
      >
        {drilldownContext?.type === 'inventorySku' ? (
          <ul className="summary-list">
            <li>
              <span>On hand</span>
              <span>
                {drilldownContext.row.onHand} {drilldownContext.row.uom}
              </span>
            </li>
            <li>
              <span>Unit cost (index)</span>
              <span>{drilldownContext.row.unitCost.toFixed(2)}</span>
            </li>
            <li>
              <span>Inventory value (index)</span>
              <span>{drilldownContext.row.value.toLocaleString()}</span>
            </li>
            <li>
              <span>Category</span>
              <span>{drilldownContext.row.category}</span>
            </li>
            <li>
              <span>Warehouse</span>
              <span>{drilldownContext.row.warehouse}</span>
            </li>
          </ul>
        ) : (
          <div className="empty-state">Select a row to view drilldown.</div>
        )}
      </DrilldownModal>

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
