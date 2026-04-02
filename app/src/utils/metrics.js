export function calculateLandedCost(components, quantity) {
  const total =
    components.material +
    components.packaging +
    components.labor +
    components.machine +
    components.transport +
    components.wastage +
    components.overhead +
    components.qc
  const unit = quantity ? total / quantity : 0
  return {
    total,
    unit,
  }
}

export function calculateYield(inputQty, outputQty) {
  if (!inputQty) return 0
  return Math.max(0, Math.min(200, (outputQty / inputQty) * 100))
}

export function calculateVariance(planned, actual) {
  const diff = actual - planned
  const pct = planned ? (diff / planned) * 100 : 0
  return {
    diff,
    pct,
  }
}

export function generateTrialBalance(accounts) {
  const rows = accounts.map((acc) => ({
    ...acc,
  }))
  const totals = rows.reduce(
    (acc, row) => {
      return {
        debit: acc.debit + (row.debit || 0),
        credit: acc.credit + (row.credit || 0),
      }
    },
    { debit: 0, credit: 0 },
  )
  const balanced = Math.round(totals.debit) === Math.round(totals.credit)
  return { rows, totals, balanced }
}

export function generateFinancialStatements({ invoices, purchaseOrders }) {
  const revenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const cogs = revenue * 0.58
  const grossProfit = revenue - cogs
  const operatingExpenses = revenue * 0.22
  const otherNet = revenue * 0.02
  const profitBeforeTax = grossProfit - operatingExpenses + otherNet
  const tax = profitBeforeTax * 0.17
  const profitAfterTax = profitBeforeTax - tax

  const receivables = invoices
    .filter((inv) => inv.status !== 'Paid')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const payables = purchaseOrders
    .filter((po) => po.status !== 'Cancelled')
    .reduce((sum, po) => sum + po.amount, 0)

  const cash = revenue * 0.25
  const inventory = revenue * 0.3
  const fixedAssets = revenue * 1.8

  const equityOpening = revenue * 1.1
  const dividends = profitAfterTax * 0.25
  const equityAdjustments = revenue * 0.02
  const equityClosing = equityOpening + profitAfterTax - dividends + equityAdjustments

  const cashFromOperations = profitBeforeTax + revenue * 0.05
  const cashFromInvesting = -revenue * 0.2
  const cashFromFinancing = revenue * 0.1
  const openingCash = cash - cashFromOperations - cashFromInvesting - cashFromFinancing
  const closingCash = cash

  return {
    pl: {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      otherNet,
      profitBeforeTax,
      tax,
      profitAfterTax,
    },
    balanceSheet: {
      assets: {
        current: {
          cash,
          receivables,
          inventory,
        },
        nonCurrent: {
          fixedAssets,
        },
      },
      liabilities: {
        current: {
          payables,
          accruals: revenue * 0.08,
        },
        nonCurrent: {
          loans: revenue * 0.9,
        },
      },
      equity: {
        shareCapital: revenue * 0.8,
        retainedEarnings: equityClosing - revenue * 0.8,
        currentYearProfit: profitAfterTax,
      },
    },
    equity: {
      opening: equityOpening,
      profit: profitAfterTax,
      dividends,
      adjustments: equityAdjustments,
      closing: equityClosing,
    },
    cashFlow: {
      operating: cashFromOperations,
      investing: cashFromInvesting,
      financing: cashFromFinancing,
      openingCash,
      closingCash,
    },
  }
}

export function generateReports({ invoices, productionOrders, inventory, salesOrders }) {
  const today = new Date()
  const month = today.getMonth() + 1

  const monthlyRevenue = invoices
    .filter((inv) => {
      const d = new Date(inv.issueDate)
      return d.getMonth() + 1 === month
    })
    .reduce((sum, inv) => sum + inv.amount, 0)

  const receivablesAging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
  }

  invoices.forEach((inv) => {
    const due = new Date(inv.dueDate)
    const diffDays = Math.round((today - due) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) receivablesAging.current += inv.amount
    else if (diffDays <= 30) receivablesAging.days30 += inv.amount
    else if (diffDays <= 60) receivablesAging.days60 += inv.amount
    else receivablesAging.days90 += inv.amount
  })

  const inventoryByWarehouse = inventory.reduce((acc, item) => {
    if (!acc[item.warehouse]) acc[item.warehouse] = 0
    acc[item.warehouse] += item.onHand
    return acc
  }, {})

  const productionPerformance = {
    totalBatches: productionOrders.length,
    completed: productionOrders.filter((p) => p.status === 'Completed').length,
    delayed: productionOrders.filter((p) => p.status === 'Delayed').length,
  }

  const salesByRegion = salesOrders.reduce((acc, so) => {
    const region = so.region ?? 'APAC'
    if (!acc[region]) acc[region] = 0
    acc[region] += so.amount ?? so.totalAmount ?? 0
    return acc
  }, {})

  return {
    monthlyRevenue,
    receivablesAging,
    inventoryByWarehouse,
    productionPerformance,
    salesByRegion,
  }
}
