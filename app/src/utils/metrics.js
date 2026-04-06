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

export function validateJournalBalance(lines) {
  const totals = lines.reduce(
    (acc, line) => {
      const debit = Number(line.debit || 0)
      const credit = Number(line.credit || 0)
      return {
        debit: acc.debit + debit,
        credit: acc.credit + credit,
      }
    },
    { debit: 0, credit: 0 },
  )
  const balanced = Math.round(totals.debit) === Math.round(totals.credit) && totals.debit > 0
  return {
    totalDebit: totals.debit,
    totalCredit: totals.credit,
    balanced,
  }
}

export function generateJournalEntriesFromDummyData({ invoices, payments }) {
  const entries = []

  const openingLines = [
    {
      id: 'j1-l1',
      accountCode: '1000',
      accountName: 'Cash and Cash Equivalents',
      debit: 120000,
      credit: 0,
      type: 'DR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l2',
      accountCode: '1100',
      accountName: 'Accounts Receivable',
      debit: 45000,
      credit: 0,
      type: 'DR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l3',
      accountCode: '1200',
      accountName: 'Inventory',
      debit: 90000,
      credit: 0,
      type: 'DR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l4',
      accountCode: '1300',
      accountName: 'Property, Plant and Equipment',
      debit: 220000,
      credit: 0,
      type: 'DR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l5',
      accountCode: '2000',
      accountName: 'Accounts Payable',
      debit: 0,
      credit: 70000,
      type: 'CR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l6',
      accountCode: '2200',
      accountName: 'Term Loans',
      debit: 0,
      credit: 150000,
      type: 'CR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l7',
      accountCode: '3000',
      accountName: 'Share Capital',
      debit: 0,
      credit: 150000,
      type: 'CR',
      linkType: 'Opening',
      linkId: null,
    },
    {
      id: 'j1-l8',
      accountCode: '3100',
      accountName: 'Retained Earnings',
      debit: 0,
      credit: 105000,
      type: 'CR',
      linkType: 'Opening',
      linkId: null,
    },
  ]

  const openingTotals = validateJournalBalance(openingLines)

  entries.push({
    id: 'j1',
    journalNumber: 'JRN-2404001',
    date: '2026-04-01',
    reference: 'OPEN-2026',
    description: 'Opening balances brought forward',
    status: 'Posted',
    createdBy: 'System',
    approvedBy: 'Finance Manager',
    lines: openingLines,
    totalDebit: openingTotals.totalDebit,
    totalCredit: openingTotals.totalCredit,
    balanced: openingTotals.balanced,
  })

  const linkedInvoices = invoices.slice(0, 3)
  linkedInvoices.forEach((inv, index) => {
    const lines = [
      {
        id: `j-inv-${index}-1`,
        accountCode: '1100',
        accountName: 'Accounts Receivable',
        debit: inv.amount,
        credit: 0,
        type: 'DR',
        linkType: 'Invoice',
        linkId: inv.id,
      },
      {
        id: `j-inv-${index}-2`,
        accountCode: '4000',
        accountName: 'Sales Revenue',
        debit: 0,
        credit: inv.amount,
        type: 'CR',
        linkType: 'Invoice',
        linkId: inv.id,
      },
    ]
    const totals = validateJournalBalance(lines)
    entries.push({
      id: `j-inv-${index}`,
      journalNumber: `JRN-INV-${String(index + 1).padStart(3, '0')}`,
      date: inv.issueDate,
      reference: inv.invoiceNumber,
      description: `Sales invoice posted for ${inv.customer}`,
      status: 'Posted',
      createdBy: 'Finance Manager',
      approvedBy: 'Finance Manager',
      lines,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      balanced: totals.balanced,
    })
  })

  const linkedPayments = payments.filter((p) => p.status === 'Posted').slice(0, 3)
  linkedPayments.forEach((pay, index) => {
    const lines = [
      {
        id: `j-pay-${index}-1`,
        accountCode: '1000',
        accountName: 'Cash and Cash Equivalents',
        debit: pay.amount,
        credit: 0,
        type: 'DR',
        linkType: 'Payment',
        linkId: pay.id,
      },
      {
        id: `j-pay-${index}-2`,
        accountCode: '1100',
        accountName: 'Accounts Receivable',
        debit: 0,
        credit: pay.amount,
        type: 'CR',
        linkType: 'Payment',
        linkId: pay.id,
      },
    ]
    const totals = validateJournalBalance(lines)
    entries.push({
      id: `j-pay-${index}`,
      journalNumber: `JRN-PAY-${String(index + 1).padStart(3, '0')}`,
      date: pay.date,
      reference: pay.paymentNumber,
      description: 'Customer payment received',
      status: 'Posted',
      createdBy: 'Finance Officer',
      approvedBy: 'Finance Manager',
      lines,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      balanced: totals.balanced,
    })
  })

  return entries
}

export function buildLedgerFromJournalEntries(journalEntries, { accountCode, openingBalance = 0 }) {
  const lines = []
  journalEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (line.accountCode !== accountCode) return
      lines.push({
        date: entry.date,
        journalId: entry.id,
        journalNumber: entry.journalNumber,
        reference: entry.reference,
        description: entry.description,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        accountCode: line.accountCode,
        accountName: line.accountName,
        status: entry.status,
        linkType: line.linkType,
        linkId: line.linkId,
      })
    })
  })

  lines.sort((a, b) => {
    if (a.date === b.date) {
      return a.journalNumber.localeCompare(b.journalNumber)
    }
    return a.date.localeCompare(b.date)
  })

  let running = openingBalance
  const transactions = lines.map((line) => {
    running += line.debit - line.credit
    return {
      ...line,
      balance: running,
    }
  })

  const totals = transactions.reduce(
    (acc, t) => ({
      debit: acc.debit + t.debit,
      credit: acc.credit + t.credit,
    }),
    { debit: 0, credit: 0 },
  )

  const closingBalance = running

  return {
    openingBalance,
    transactions,
    totalDebit: totals.debit,
    totalCredit: totals.credit,
    closingBalance,
  }
}

export function calculateLedgerBalance(journalEntries, accountCode) {
  const ledger = buildLedgerFromJournalEntries(journalEntries, { accountCode, openingBalance: 0 })
  return {
    openingBalance: ledger.openingBalance,
    totalDebit: ledger.totalDebit,
    totalCredit: ledger.totalCredit,
    closingBalance: ledger.closingBalance,
  }
}
