import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { ReportCard } from '../components/ReportCard'
import { ReportFilterBar } from '../components/ReportFilterBar'
import { StatementTable } from '../components/StatementTable'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'
import { canEditModule } from '../utils/permissions'
import {
  buildLedgerFromJournalEntries,
  generateFinancialStatements,
  generateTrialBalance,
  validateJournalBalance,
} from '../utils/metrics'

const invoiceLinesById = {
  inv1: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 1200,
      uom: 'bottles',
      unitPrice: 28,
      lineTotal: 33600,
    },
    {
      sku: 'FG-SAUCE-HERB',
      description: 'Herb Marinade 1L',
      quantity: 300,
      uom: 'bottles',
      unitPrice: 28,
      lineTotal: 8400,
    },
  ],
  inv2: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 800,
      uom: 'bottles',
      unitPrice: 20,
      lineTotal: 16000,
    },
    {
      sku: 'FG-SAUCE-MARINADE',
      description: 'Signature Marinade 2kg pouch',
      quantity: 150,
      uom: 'packs',
      unitPrice: 100,
      lineTotal: 15000,
    },
  ],
  inv3: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 600,
      uom: 'bottles',
      unitPrice: 30,
      lineTotal: 18000,
    },
    {
      sku: 'FG-SAUCE-HERB',
      description: 'Herb Marinade 1L',
      quantity: 300,
      uom: 'bottles',
      unitPrice: 30,
      lineTotal: 9000,
    },
  ],
  inv4: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 18000,
      uom: 'bottles',
      unitPrice: 25000,
      lineTotal: 450000000,
    },
    {
      sku: 'FG-SAUCE-HERB',
      description: 'Herb Marinade 1L',
      quantity: 9200,
      uom: 'bottles',
      unitPrice: 25000,
      lineTotal: 230000000,
    },
  ],
  inv5: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 900,
      uom: 'bottles',
      unitPrice: 24,
      lineTotal: 21600,
    },
    {
      sku: 'FG-SAUCE-MARINADE',
      description: 'Signature Marinade 2kg pouch',
      quantity: 300,
      uom: 'packs',
      unitPrice: 48,
      lineTotal: 14400,
    },
  ],
  inv6: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 500,
      uom: 'bottles',
      unitPrice: 26,
      lineTotal: 13000,
    },
    {
      sku: 'FG-SAUCE-HERB',
      description: 'Herb Marinade 1L',
      quantity: 250,
      uom: 'bottles',
      unitPrice: 26,
      lineTotal: 6500,
    },
  ],
  inv7: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 1400,
      uom: 'bottles',
      unitPrice: 25,
      lineTotal: 35000,
    },
    {
      sku: 'FG-SAUCE-MARINADE',
      description: 'Signature Marinade 2kg pouch',
      quantity: 800,
      uom: 'packs',
      unitPrice: 22.5,
      lineTotal: 18000,
    },
  ],
  inv8: [
    {
      sku: 'FG-SAUCE-CHILI',
      description: 'Premium Chili Sauce 500ml',
      quantity: 900,
      uom: 'bottles',
      unitPrice: 32,
      lineTotal: 28800,
    },
    {
      sku: 'FG-SAUCE-HERB',
      description: 'Herb Marinade 1L',
      quantity: 600,
      uom: 'bottles',
      unitPrice: 32,
      lineTotal: 19200,
    },
  ],
}

export function FinancePage() {
  const {
    invoices,
    payments,
    purchaseOrders,
    journalEntries,
    ledgerAccounts,
    addInvoice,
    addPayment,
    addJournalEntry,
  } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('overview')
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [statementView, setStatementView] = useState('pl')
  const [period, setPeriod] = useState('mtd')
  const [year, setYear] = useState('2026')
  const [invoiceForm, setInvoiceForm] = useState({
    customer: '',
    orderId: '',
    currency: 'SGD',
    amount: '',
    dueDate: '',
  })
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    method: 'Bank Transfer',
    currency: 'SGD',
  })
  const [journalModalOpen, setJournalModalOpen] = useState(false)
  const [journalDetailOpen, setJournalDetailOpen] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState(null)
  const [journalFilters, setJournalFilters] = useState({
    from: '',
    to: '',
    status: 'all',
    accountCode: 'all',
    search: '',
  })
  const [journalForm, setJournalForm] = useState({
    date: '',
    reference: '',
    description: '',
    status: 'Draft',
    lines: [
      { accountCode: '', debit: '', credit: '' },
      { accountCode: '', debit: '', credit: '' },
    ],
  })
  const [journalTotals, setJournalTotals] = useState({
    totalDebit: 0,
    totalCredit: 0,
    balanced: false,
  })
  const [ledgerTabAccountCode, setLedgerTabAccountCode] = useState('1100')
  const [ledgerFilters, setLedgerFilters] = useState({
    from: '',
    to: '',
    type: 'all',
    search: '',
  })
  const [ledgerDetailOpen, setLedgerDetailOpen] = useState(false)
  const [selectedLedgerRow, setSelectedLedgerRow] = useState(null)

  const canEdit = canEditModule(currentUser?.role, 'finance')

  const summary = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const receivables = invoices
      .filter((inv) => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + inv.amount, 0)
    const paid = invoices
      .filter((inv) => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const payables = purchaseOrders
      .filter((po) => po.status !== 'Cancelled')
      .reduce((sum, po) => sum + po.amount, 0)

    const budget = totalRevenue * 0.9 || 250000

    return {
      totalRevenue,
      receivables,
      payables,
      budget,
      actual: totalRevenue - payables,
      paid,
    }
  }, [invoices, purchaseOrders])

  const statements = useMemo(
    () =>
      generateFinancialStatements({
        invoices,
        payments,
        purchaseOrders,
      }),
    [invoices, payments, purchaseOrders],
  )

  const trialBalance = generateTrialBalance(
    ledgerAccounts.map((acc) => {
      const totals = journalEntries.reduce(
        (res, j) => {
          j.lines.forEach((line) => {
            if (line.accountCode !== acc.code) return
            res.debit += Number(line.debit || 0)
            res.credit += Number(line.credit || 0)
          })
          return res
        },
        { debit: 0, credit: 0 },
      )
      return {
        code: acc.code,
        name: acc.name,
        debit: totals.debit,
        credit: totals.credit,
      }
    }),
  )

  const selectedInvoiceLines = selectedInvoice
    ? invoiceLinesById[selectedInvoice.id] ?? []
    : []

  const selectedInvoicePayments = useMemo(
    () =>
      selectedInvoice ? payments.filter((p) => p.invoiceId === selectedInvoice.id) : [],
    [payments, selectedInvoice],
  )

  const selectedInvoicePaymentSummary = useMemo(() => {
    if (!selectedInvoice) {
      return { totalPaid: 0, balance: 0 }
    }
    const totalPaid = selectedInvoicePayments
      .filter((p) => p.status === 'Posted')
      .reduce((sum, p) => sum + p.amount, 0)
    const balance = selectedInvoice.amount - totalPaid
    return { totalPaid, balance }
  }, [selectedInvoice, selectedInvoicePayments])

  const filteredJournals = useMemo(() => {
    return journalEntries.filter((j) => {
      if (journalFilters.status !== 'all' && j.status !== journalFilters.status) return false
      if (journalFilters.accountCode !== 'all') {
        const hasAccount = j.lines.some((l) => l.accountCode === journalFilters.accountCode)
        if (!hasAccount) return false
      }
      if (journalFilters.from && j.date < journalFilters.from) return false
      if (journalFilters.to && j.date > journalFilters.to) return false
      if (journalFilters.search) {
        const term = journalFilters.search.toLowerCase()
        const match =
          j.journalNumber.toLowerCase().includes(term) ||
          (j.reference ?? '').toLowerCase().includes(term) ||
          (j.description ?? '').toLowerCase().includes(term)
        if (!match) return false
      }
      return true
    })
  }, [journalEntries, journalFilters])

  const selectedLedgerAccount = useMemo(
    () => ledgerAccounts.find((a) => a.code === ledgerTabAccountCode) ?? ledgerAccounts[0],
    [ledgerAccounts, ledgerTabAccountCode],
  )

  const fullLedger = useMemo(
    () =>
      buildLedgerFromJournalEntries(journalEntries, {
        accountCode: selectedLedgerAccount?.code,
        openingBalance: 0,
      }),
    [journalEntries, selectedLedgerAccount],
  )

  const filteredLedgerTransactions = useMemo(() => {
    return fullLedger.transactions.filter((t) => {
      if (ledgerFilters.from && t.date < ledgerFilters.from) return false
      if (ledgerFilters.to && t.date > ledgerFilters.to) return false
      if (ledgerFilters.type !== 'all') {
        if ((ledgerFilters.type === 'invoice' && t.linkType !== 'Invoice') || (ledgerFilters.type === 'payment' && t.linkType !== 'Payment') || (ledgerFilters.type === 'journal' && t.linkType !== 'Manual')) {
          return false
        }
      }
      if (ledgerFilters.search) {
        const term = ledgerFilters.search.toLowerCase()
        const match =
          (t.reference ?? '').toLowerCase().includes(term) ||
          (t.description ?? '').toLowerCase().includes(term) ||
          (t.journalNumber ?? '').toLowerCase().includes(term)
        if (!match) return false
      }
      return true
    })
  }, [fullLedger.transactions, ledgerFilters])

  function updateJournalTotals(nextLines) {
    const totals = validateJournalBalance(
      nextLines.map((l) => ({
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      })),
    )
    setJournalTotals(totals)
  }

  function handleInvoiceSubmit(e) {
    e.preventDefault()
    const amount = Number(invoiceForm.amount || 0)
    if (!invoiceForm.customer || !amount) return
    addInvoice(
      {
        customer: invoiceForm.customer,
        orderId: invoiceForm.orderId || null,
        currency: invoiceForm.currency,
        amount,
        dueDate: invoiceForm.dueDate || null,
      },
      currentUser,
    )
    setInvoiceModalOpen(false)
    setInvoiceForm({
      customer: '',
      orderId: '',
      currency: 'SGD',
      amount: '',
      dueDate: '',
    })
    showToast('Invoice created and added to receivables.', 'success')
  }

  function handlePaymentSubmit(e) {
    e.preventDefault()
    const amount = Number(paymentForm.amount || 0)
    if (!paymentForm.invoiceId || !amount) return
    addPayment(
      {
        invoiceId: paymentForm.invoiceId,
        currency: paymentForm.currency,
        method: paymentForm.method,
        amount,
      },
      currentUser,
    )
    setPaymentModalOpen(false)
    setPaymentForm({
      invoiceId: '',
      amount: '',
      method: 'Bank Transfer',
      currency: 'SGD',
    })
    showToast('Payment posted against selected invoice.', 'success')
  }

  function handleJournalFilterChange(key, value) {
    setJournalFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function handleJournalLineChange(index, key, value) {
    setJournalForm((prev) => {
      const lines = prev.lines.map((line, i) =>
        i === index
          ? {
              ...line,
              [key]: value,
            }
          : line,
      )
      updateJournalTotals(lines)
      return {
        ...prev,
        lines,
      }
    })
  }

  function handleJournalAddLine() {
    setJournalForm((prev) => {
      const lines = [...prev.lines, { accountCode: '', debit: '', credit: '' }]
      updateJournalTotals(lines)
      return { ...prev, lines }
    })
  }

  function handleJournalRemoveLine(index) {
    setJournalForm((prev) => {
      const lines = prev.lines.filter((_, i) => i !== index)
      updateJournalTotals(lines)
      return { ...prev, lines }
    })
  }

  function handleJournalSubmit(e) {
    e.preventDefault()
    const preparedLines = journalForm.lines
      .map((line) => {
        const account = ledgerAccounts.find((a) => a.code === line.accountCode)
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        if (!account || (!debit && !credit)) {
          return null
        }
        return {
          accountCode: account.code,
          accountName: account.name,
          debit,
          credit,
        }
      })
      .filter(Boolean)

    const totals = validateJournalBalance(preparedLines)
    if (!totals.balanced) {
      showToast('Journal is not balanced. Total debit must equal total credit.', 'danger')
      return
    }

    const result = addJournalEntry(
      {
        date: journalForm.date,
        reference: journalForm.reference,
        description: journalForm.description,
        status: journalForm.status,
        lines: preparedLines,
      },
      currentUser,
    )

    if (!result?.success) {
      showToast(result?.error ?? 'Unable to create journal entry.', 'danger')
      return
    }

    setJournalModalOpen(false)
    setJournalForm({
      date: '',
      reference: '',
      description: '',
      status: 'Draft',
      lines: [
        { accountCode: '', debit: '', credit: '' },
        { accountCode: '', debit: '', credit: '' },
      ],
    })
    setJournalTotals({
      totalDebit: 0,
      totalCredit: 0,
      balanced: false,
    })
    showToast('Journal entry created.', 'success')
  }

  function handleLedgerFilterChange(key, value) {
    setLedgerFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <div className="page">
      <PageHeader
        title="Finance workspace"
        subtitle="Monitor revenue, receivables, and payables with live links to sales and procurement."
        actions={
          canEdit ? (
            <>
              <button
                type="button"
                className="button ghost"
                onClick={() => setInvoiceModalOpen(true)}
              >
                Add invoice
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => setPaymentModalOpen(true)}
              >
                Record payment
              </button>
            </>
          ) : null
        }
      />

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'invoices' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
          <button
            className={`tab ${activeTab === 'payments' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          <button
            className={`tab ${activeTab === 'statements' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('statements')}
          >
            Financial Statements
          </button>
          <button
            className={`tab ${activeTab === 'trial' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('trial')}
          >
            Trial Balance
          </button>
          <button
            className={`tab ${activeTab === 'journal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('journal')}
          >
            Journal
          </button>
          <button
            className={`tab ${activeTab === 'ledger' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            Individual Ledger
          </button>
          <button
            className={`tab ${activeTab === 'notes' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes & Disclosures
          </button>
        </div>
      </section>

      {activeTab === 'overview' && (
        <>
          <section className="grid grid-4">
            <StatCard
              label="Total revenue (all currencies)"
              value={`$${summary.totalRevenue.toLocaleString()}`}
              trend="Consolidated across all entities"
              tone="primary"
            />
            <StatCard
              label="Outstanding receivables"
              value={`$${summary.receivables.toLocaleString()}`}
              trend={`${invoices.filter((i) => i.status !== 'Paid').length} open invoices`}
              tone="accent"
            />
            <StatCard
              label="Committed payables"
              value={`$${summary.payables.toLocaleString()}`}
              trend={`${purchaseOrders.length} purchase orders`}
              tone="warning"
            />
            <StatCard
              label="Budget vs actual"
              value={`$${summary.actual.toLocaleString()}`}
              trend={`Budget ${summary.budget.toLocaleString()} | Actual ${
                summary.actual >= summary.budget ? 'on track' : 'behind'
              }`}
              tone={summary.actual >= summary.budget ? 'success' : 'danger'}
            />
          </section>

          <section className="grid grid-3">
            <ReportCard
              label="Net profit after tax"
              value={`$${statements.pl.profitAfterTax.toLocaleString()}`}
              sublabel="For selected period"
              tone={statements.pl.profitAfterTax >= 0 ? 'success' : 'danger'}
            />
            <ReportCard
              label="Cash and cash equivalents"
              value={`$${statements.balanceSheet.assets.current.cash.toLocaleString()}`}
              sublabel="Balance sheet snapshot"
              tone="neutral"
            />
            <ReportCard
              label="Debt to equity ratio"
              value={(
                statements.balanceSheet.liabilities.nonCurrent.loans /
                  statements.equity.closing || 0
              ).toFixed(2)}
              sublabel="Leverage indicator"
              tone="accent"
            />
          </section>
        </>
      )}

      {activeTab === 'invoices' && (
        <>
          <ReportFilterBar
            period={period}
            year={year}
            onPeriodChange={setPeriod}
            onYearChange={setYear}
            onExport={() => showToast('Invoice report export simulated.', 'info')}
            onPrint={() => showToast('Invoice report print simulated.', 'info')}
          />
          <section className="grid grid-1">
            <div className="card">
              <div className="card-header">
                <h3>Invoices</h3>
                <span className="card-subtitle">Receivables</span>
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
                  { key: 'issueDate', header: 'Issue date' },
                  { key: 'dueDate', header: 'Due date' },
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
                  {
                    key: 'id',
                    header: '',
                    render: (_, row) => (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setSelectedInvoice(row)
                          setInvoiceDetailOpen(true)
                        }}
                      >
                        View
                      </button>
                    ),
                  },
                ]}
                data={invoices}
              />
            </div>
          </section>
        </>
      )}

      {activeTab === 'payments' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Payments</h3>
              <span className="card-subtitle">Cash movement</span>
            </div>
            <DataTable
              columns={[
                { key: 'paymentNumber', header: 'Payment' },
                { key: 'invoiceId', header: 'Invoice ID' },
                { key: 'date', header: 'Date' },
                { key: 'method', header: 'Method' },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (value, row) => `${row.currency} ${value.toLocaleString()}`,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (value) => (
                    <Badge tone={value === 'Posted' ? 'success' : 'neutral'}>{value}</Badge>
                  ),
                },
              ]}
              data={payments}
            />
          </div>
        </section>
      )}

      {activeTab === 'journal' && (
        <>
          <section className="grid grid-4">
            <StatCard
              label="Journal entries"
              value={journalEntries.length}
              trend="Including opening balances and system postings"
              tone="neutral"
            />
            <StatCard
              label="Posted journals"
              value={journalEntries.filter((j) => j.status === 'Posted').length}
              trend="Ready for reporting"
              tone="success"
            />
            <StatCard
              label="Draft journals"
              value={journalEntries.filter((j) => j.status === 'Draft').length}
              trend="Work in progress"
              tone="warning"
            />
            <StatCard
              label="Approved journals"
              value={journalEntries.filter((j) => j.status === 'Approved').length}
              trend="Awaiting posting to ledger"
              tone="accent"
            />
          </section>

          <section className="grid grid-1">
            <div className="card">
              <div className="card-header card-header-spaced">
                <div>
                  <h3>Journal</h3>
                  <span className="card-subtitle">
                    Book-level view of accounting entries across cash, AR, AP, and revenue.
                  </span>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setJournalModalOpen(true)}
                  >
                    Add journal entry
                  </button>
                ) : null}
              </div>

              <div className="filters-row">
                <div className="filters-group">
                  <label className="field">
                    <span className="field-label">From</span>
                    <input
                      type="date"
                      className="input"
                      value={journalFilters.from}
                      onChange={(e) => handleJournalFilterChange('from', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">To</span>
                    <input
                      type="date"
                      className="input"
                      value={journalFilters.to}
                      onChange={(e) => handleJournalFilterChange('to', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Status</span>
                    <select
                      className="input input-select"
                      value={journalFilters.status}
                      onChange={(e) => handleJournalFilterChange('status', e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="Draft">Draft</option>
                      <option value="Posted">Posted</option>
                      <option value="Approved">Approved</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Account</span>
                    <select
                      className="input input-select"
                      value={journalFilters.accountCode}
                      onChange={(e) => handleJournalFilterChange('accountCode', e.target.value)}
                    >
                      <option value="all">All accounts</option>
                      {ledgerAccounts.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} — {acc.displayName ?? acc.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="filters-group">
                  <label className="field">
                    <span className="field-label">Search</span>
                    <input
                      type="text"
                      className="input"
                      placeholder="Journal no., reference, description"
                      value={journalFilters.search}
                      onChange={(e) => handleJournalFilterChange('search', e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <DataTable
                columns={[
                  { key: 'journalNumber', header: 'Journal No' },
                  { key: 'date', header: 'Date' },
                  { key: 'reference', header: 'Reference' },
                  { key: 'description', header: 'Description' },
                  {
                    key: 'primaryAccount',
                    header: 'Primary account',
                    render: (_, row) => row.lines[0]?.accountName ?? 'Multiple',
                  },
                  {
                    key: 'totalDebit',
                    header: 'Debit',
                    render: (v) => v.toLocaleString(),
                  },
                  {
                    key: 'totalCredit',
                    header: 'Credit',
                    render: (v) => v.toLocaleString(),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (value) => {
                      const tone =
                        value === 'Posted'
                          ? 'success'
                          : value === 'Approved'
                            ? 'accent'
                            : 'warning'
                      return <Badge tone={tone}>{value}</Badge>
                    },
                  },
                  {
                    key: 'createdBy',
                    header: 'Created by',
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (_, row) => (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setSelectedJournal(row)
                          setJournalDetailOpen(true)
                        }}
                      >
                        View
                      </button>
                    ),
                  },
                ]}
                data={filteredJournals}
              />
            </div>
          </section>
        </>
      )}

      {activeTab === 'ledger' && (
        <>
          <section className="grid grid-1">
            <div className="card">
              <div className="card-header card-header-spaced">
                <div>
                  <h3>Individual ledger</h3>
                  <span className="card-subtitle">
                    Account-wise ledger with running balances from journal entries.
                  </span>
                </div>
                <div className="button-group">
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                      showToast(
                        `Exported ledger for ${selectedLedgerAccount?.displayName ?? selectedLedgerAccount?.name}.`,
                        'info',
                      )
                    }
                  >
                    Export ledger
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                      showToast(
                        `Print preview for ledger ${selectedLedgerAccount?.displayName ?? selectedLedgerAccount?.name}.`,
                        'info',
                      )
                    }
                  >
                    Print ledger
                  </button>
                </div>
              </div>

              <div className="filters-row">
                <div className="filters-group">
                  <label className="field">
                    <span className="field-label">Account</span>
                    <select
                      className="input input-select"
                      value={ledgerTabAccountCode}
                      onChange={(e) => setLedgerTabAccountCode(e.target.value)}
                    >
                      {ledgerAccounts.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} — {acc.displayName ?? acc.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">From</span>
                    <input
                      type="date"
                      className="input"
                      value={ledgerFilters.from}
                      onChange={(e) => handleLedgerFilterChange('from', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">To</span>
                    <input
                      type="date"
                      className="input"
                      value={ledgerFilters.to}
                      onChange={(e) => handleLedgerFilterChange('to', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Transaction type</span>
                    <select
                      className="input input-select"
                      value={ledgerFilters.type}
                      onChange={(e) => handleLedgerFilterChange('type', e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="invoice">Invoices</option>
                      <option value="payment">Payments</option>
                      <option value="journal">Manual journals</option>
                    </select>
                  </label>
                </div>
                <div className="filters-group">
                  <label className="field">
                    <span className="field-label">Search</span>
                    <input
                      type="text"
                      className="input"
                      placeholder="Reference, journal no., description"
                      value={ledgerFilters.search}
                      onChange={(e) => handleLedgerFilterChange('search', e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <section className="grid grid-4">
                <StatCard
                  label="Opening balance"
                  value={fullLedger.openingBalance.toLocaleString()}
                  trend={selectedLedgerAccount?.displayName ?? selectedLedgerAccount?.name}
                  tone="neutral"
                />
                <StatCard
                  label="Total debit"
                  value={fullLedger.totalDebit.toLocaleString()}
                  trend="Debits in selected period"
                  tone="primary"
                />
                <StatCard
                  label="Total credit"
                  value={fullLedger.totalCredit.toLocaleString()}
                  trend="Credits in selected period"
                  tone="primary"
                />
                <StatCard
                  label="Closing balance"
                  value={fullLedger.closingBalance.toLocaleString()}
                  trend="Ledger closing balance"
                  tone={fullLedger.closingBalance >= 0 ? 'success' : 'danger'}
                />
              </section>

              <DataTable
                columns={[
                  { key: 'date', header: 'Date' },
                  { key: 'journalNumber', header: 'Voucher / Ref No' },
                  { key: 'reference', header: 'Reference' },
                  { key: 'description', header: 'Description' },
                  {
                    key: 'debit',
                    header: 'Debit',
                    render: (v) => (v ? v.toLocaleString() : ''),
                  },
                  {
                    key: 'credit',
                    header: 'Credit',
                    render: (v) => (v ? v.toLocaleString() : ''),
                  },
                  {
                    key: 'balance',
                    header: 'Running balance',
                    render: (v) => v.toLocaleString(),
                  },
                  {
                    key: 'source',
                    header: 'Source',
                    render: (_, row) => row.linkType ?? 'Journal',
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (_, row) => (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setSelectedLedgerRow(row)
                          setLedgerDetailOpen(true)
                        }}
                      >
                        View
                      </button>
                    ),
                  },
                ]}
                data={filteredLedgerTransactions}
              />
            </div>
          </section>
        </>
      )}

      {activeTab === 'statements' && (
        <>
          <ReportFilterBar
            period={period}
            year={year}
            onPeriodChange={setPeriod}
            onYearChange={setYear}
            onExport={() => showToast('Financial statements export simulated.', 'info')}
            onPrint={() => showToast('Financial statements print simulated.', 'info')}
          />
          <section className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${statementView === 'pl' ? 'tab-active' : ''}`}
                onClick={() => setStatementView('pl')}
              >
                Profit & Loss
              </button>
              <button
                className={`tab ${statementView === 'bs' ? 'tab-active' : ''}`}
                onClick={() => setStatementView('bs')}
              >
                Balance Sheet
              </button>
              <button
                className={`tab ${statementView === 'cf' ? 'tab-active' : ''}`}
                onClick={() => setStatementView('cf')}
              >
                Cash Flow
              </button>
              <button
                className={`tab ${statementView === 'equity' ? 'tab-active' : ''}`}
                onClick={() => setStatementView('equity')}
              >
                Changes in Equity
              </button>
            </div>
          </section>

          {statementView === 'pl' && (
            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Profit & Loss Statement</h3>
                  <span className="card-subtitle">For the selected period</span>
                </div>
                <StatementTable
                  sections={[
                    {
                      title: 'Revenue',
                      rows: [
                        {
                          label: 'Sales revenue',
                          value: statements.pl.revenue.toLocaleString(),
                        },
                      ],
                      total: {
                        label: 'Total revenue',
                        value: statements.pl.revenue.toLocaleString(),
                      },
                    },
                    {
                      title: 'Cost of goods sold',
                      rows: [
                        {
                          label: 'Cost of goods sold',
                          value: statements.pl.cogs.toLocaleString(),
                        },
                      ],
                      total: {
                        label: 'Total cost of sales',
                        value: statements.pl.cogs.toLocaleString(),
                      },
                    },
                    {
                      title: 'Gross profit',
                      rows: [],
                      total: {
                        label: 'Gross profit',
                        value: statements.pl.grossProfit.toLocaleString(),
                      },
                    },
                    {
                      title: 'Operating expenses',
                      rows: [
                        {
                          label: 'Operating expenses',
                          value: statements.pl.operatingExpenses.toLocaleString(),
                        },
                      ],
                      total: {
                        label: 'Total operating expenses',
                        value: statements.pl.operatingExpenses.toLocaleString(),
                      },
                    },
                    {
                      title: 'Other income / expenses',
                      rows: [
                        {
                          label: 'Net other income',
                          value: statements.pl.otherNet.toLocaleString(),
                        },
                      ],
                      total: {
                        label: 'Net other income',
                        value: statements.pl.otherNet.toLocaleString(),
                      },
                    },
                    {
                      title: 'Net profit',
                      rows: [
                        {
                          label: 'Net profit before tax',
                          value: statements.pl.profitBeforeTax.toLocaleString(),
                        },
                        {
                          label: 'Income tax expense',
                          value: `(${statements.pl.tax.toLocaleString()})`,
                        },
                      ],
                      total: {
                        label: 'Net profit after tax',
                        value: statements.pl.profitAfterTax.toLocaleString(),
                      },
                    },
                  ]}
                />
              </div>
            </section>
          )}

          {statementView === 'bs' && (
            <section className="grid grid-2">
              <div className="card">
                <div className="card-header">
                  <h3>Assets</h3>
                  <span className="card-subtitle">Current and non-current</span>
                </div>
                <StatementTable
                  sections={[
                    {
                      title: 'Current assets',
                      rows: [
                        {
                          label: 'Cash and cash equivalents',
                          value:
                            statements.balanceSheet.assets.current.cash.toLocaleString(),
                        },
                        {
                          label: 'Trade receivables',
                          value:
                            statements.balanceSheet.assets.current.receivables.toLocaleString(),
                        },
                        {
                          label: 'Inventories',
                          value:
                            statements.balanceSheet.assets.current.inventory.toLocaleString(),
                        },
                      ],
                    },
                    {
                      title: 'Non-current assets',
                      rows: [
                        {
                          label: 'Property, plant and equipment',
                          value:
                            statements.balanceSheet.assets.nonCurrent.fixedAssets.toLocaleString(),
                        },
                      ],
                    },
                  ]}
                />
              </div>
              <div className="card">
                <div className="card-header">
                  <h3>Liabilities and equity</h3>
                  <span className="card-subtitle">Current, non-current, and equity</span>
                </div>
                <StatementTable
                  sections={[
                    {
                      title: 'Current liabilities',
                      rows: [
                        {
                          label: 'Trade payables',
                          value:
                            statements.balanceSheet.liabilities.current.payables.toLocaleString(),
                        },
                        {
                          label: 'Accruals',
                          value:
                            statements.balanceSheet.liabilities.current.accruals.toLocaleString(),
                        },
                      ],
                    },
                    {
                      title: 'Non-current liabilities',
                      rows: [
                        {
                          label: 'Term loans',
                          value:
                            statements.balanceSheet.liabilities.nonCurrent.loans.toLocaleString(),
                        },
                      ],
                    },
                    {
                      title: 'Equity',
                      rows: [
                        {
                          label: 'Share capital',
                          value:
                            statements.balanceSheet.equity.shareCapital.toLocaleString(),
                        },
                        {
                          label: 'Retained earnings',
                          value:
                            statements.balanceSheet.equity.retainedEarnings.toLocaleString(),
                        },
                        {
                          label: 'Current year profit',
                          value:
                            statements.balanceSheet.equity.currentYearProfit.toLocaleString(),
                        },
                      ],
                    },
                  ]}
                />
              </div>
            </section>
          )}

          {statementView === 'cf' && (
            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Cash Flow Statement</h3>
                  <span className="card-subtitle">Indirect method, summary view</span>
                </div>
                <StatementTable
                  sections={[
                    {
                      title: 'Operating activities',
                      rows: [
                        {
                          label: 'Net cash from operating activities',
                          value: statements.cashFlow.operating.toLocaleString(),
                        },
                      ],
                    },
                    {
                      title: 'Investing activities',
                      rows: [
                        {
                          label: 'Net cash from investing activities',
                          value: statements.cashFlow.investing.toLocaleString(),
                        },
                      ],
                    },
                    {
                      title: 'Financing activities',
                      rows: [
                        {
                          label: 'Net cash from financing activities',
                          value: statements.cashFlow.financing.toLocaleString(),
                        },
                      ],
                    },
                    {
                      title: 'Cash reconciliation',
                      rows: [
                        {
                          label: 'Opening cash balance',
                          value: statements.cashFlow.openingCash.toLocaleString(),
                        },
                        {
                          label: 'Net change in cash',
                          value: (
                            statements.cashFlow.operating +
                            statements.cashFlow.investing +
                            statements.cashFlow.financing
                          ).toLocaleString(),
                        },
                        {
                          label: 'Closing cash balance',
                          value: statements.cashFlow.closingCash.toLocaleString(),
                        },
                      ],
                    },
                  ]}
                />
              </div>
            </section>
          )}

          {statementView === 'equity' && (
            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Statement of Changes in Equity</h3>
                  <span className="card-subtitle">For the selected period</span>
                </div>
                <StatementTable
                  sections={[
                    {
                      title: 'Equity movement',
                      rows: [
                        {
                          label: 'Opening equity',
                          value: statements.equity.opening.toLocaleString(),
                        },
                        {
                          label: 'Profit for the period',
                          value: statements.equity.profit.toLocaleString(),
                        },
                        {
                          label: 'Dividends / drawings',
                          value: `(${statements.equity.dividends.toLocaleString()})`,
                        },
                        {
                          label: 'Adjustments',
                          value: statements.equity.adjustments.toLocaleString(),
                        },
                      ],
                      total: {
                        label: 'Closing equity',
                        value: statements.equity.closing.toLocaleString(),
                      },
                    },
                  ]}
                />
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'trial' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>General Ledger Summary</h3>
              <span className="card-subtitle">Trial balance snapshot</span>
            </div>
            <DataTable
              columns={[
                { key: 'code', header: 'Account #' },
                { key: 'name', header: 'Account Name' },
                {
                  key: 'balance',
                  header: 'Debit',
                  render: (_, row) => (row.debit ? row.debit.toLocaleString() : ''),
                },
                {
                  key: 'credit',
                  header: 'Credit',
                  render: (_, row) => (row.credit ? row.credit.toLocaleString() : ''),
                },
              ]}
              data={trialBalance.rows}
            />
            <div className="trial-balance-footer">
              <div className="trial-balance-totals">
                <span>Total debit</span>
                <span>{trialBalance.totals.debit.toLocaleString()}</span>
              </div>
              <div className="trial-balance-totals">
                <span>Total credit</span>
                <span>{trialBalance.totals.credit.toLocaleString()}</span>
              </div>
              <div className="trial-balance-status">
                <Badge tone={trialBalance.balanced ? 'success' : 'danger'}>
                  {trialBalance.balanced ? 'Balanced' : 'Out of balance'}
                </Badge>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Accounting policies</h3>
              <span className="card-subtitle">Basis of preparation</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Revenue recognition</span>
                <span>
                  Revenue from sale of goods is recognised when control transfers to customers,
                  typically on delivery from Foods Pacific&apos;s warehouses.
                </span>
              </li>
              <li>
                <span>Functional currency</span>
                <span>
                  The functional currency of Foods Pacific Pte Ltd is Singapore Dollar (SGD).
                </span>
              </li>
              <li>
                <span>Measurement basis</span>
                <span>
                  Financial statements are prepared on a historical cost basis, except for certain
                  financial instruments measured at fair value.
                </span>
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Key estimates and judgements</h3>
              <span className="card-subtitle">Critical areas of estimation</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Inventory valuation</span>
                <span>
                  Inventories are measured at the lower of cost and net realisable value using a
                  standard cost approach calibrated to recent production runs.
                </span>
              </li>
              <li>
                <span>Depreciation</span>
                <span>
                  Production lines are depreciated on a straight-line basis over 8-10 years based on
                  expected useful lives.
                </span>
              </li>
              <li>
                <span>Expected credit losses</span>
                <span>
                  Receivables are assessed against historical loss rates by customer segment and
                  geography.
                </span>
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Receivables and credit risk</h3>
              <span className="card-subtitle">Trade receivables exposure</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Concentration</span>
                <span>
                  Top 5 customers account for approximately 62% of total trade receivables.
                </span>
              </li>
              <li>
                <span>Overdue balances</span>
                <span>
                  Overdue balances above 60 days are closely monitored with escalation to sales and
                  finance.
                </span>
              </li>
              <li>
                <span>Credit insurance</span>
                <span>
                  Selected export customers are covered by credit insurance where commercially
                  viable.
                </span>
              </li>
            </ul>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Contingencies and commitments</h3>
              <span className="card-subtitle">Off-balance sheet items</span>
            </div>
            <ul className="summary-list">
              <li>
                <span>Operating leases</span>
                <span>
                  The Group leases warehouse space under cancellable operating lease arrangements.
                </span>
              </li>
              <li>
                <span>Supplier contracts</span>
                <span>
                  Long-term supply agreements exist for key agricultural inputs with volume
                  commitments.
                </span>
              </li>
              <li>
                <span>Legal claims</span>
                <span>
                  At the reporting date, there are no material legal claims known to management.
                </span>
              </li>
            </ul>
          </div>
        </section>
      )}

      <Modal
        open={Boolean(selectedInvoice) && invoiceDetailOpen}
        onClose={() => {
          setInvoiceDetailOpen(false)
          setSelectedInvoice(null)
        }}
        title={selectedInvoice ? `Invoice ${selectedInvoice.invoiceNumber}` : 'Invoice details'}
        size="lg"
      >
        {selectedInvoice && (
          <div className="form-grid">
            <div className="card-header card-header-spaced">
              <div>
                <h3>{selectedInvoice.customer}</h3>
                <span className="card-subtitle">
                  {selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()} •{' '}
                  {selectedInvoice.status}
                </span>
              </div>
              <Badge
                tone={
                  selectedInvoice.status === 'Paid'
                    ? 'success'
                    : selectedInvoice.status === 'Partially Paid'
                      ? 'warning'
                      : 'danger'
                }
              >
                {selectedInvoice.status}
              </Badge>
            </div>

            <section className="grid grid-3">
              <div>
                <h4>Invoice details</h4>
                <ul className="summary-list">
                  <li>
                    <span>Invoice number</span>
                    <span>{selectedInvoice.invoiceNumber}</span>
                  </li>
                  <li>
                    <span>Linked sales order</span>
                    <span>{selectedInvoice.orderId ?? 'Not linked'}</span>
                  </li>
                  <li>
                    <span>Issue date</span>
                    <span>{selectedInvoice.issueDate}</span>
                  </li>
                  <li>
                    <span>Due date</span>
                    <span>{selectedInvoice.dueDate}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Payment summary</h4>
                <ul className="summary-list">
                  <li>
                    <span>Total invoiced</span>
                    <span>
                      {selectedInvoice.currency}{' '}
                      {selectedInvoice.amount.toLocaleString()}
                    </span>
                  </li>
                  <li>
                    <span>Total paid</span>
                    <span>
                      {selectedInvoice.currency}{' '}
                      {selectedInvoicePaymentSummary.totalPaid.toLocaleString()}
                    </span>
                  </li>
                  <li>
                    <span>Outstanding</span>
                    <span>
                      {selectedInvoice.currency}{' '}
                      {selectedInvoicePaymentSummary.balance.toLocaleString()}
                    </span>
                  </li>
                  <li>
                    <span>Payment count</span>
                    <span>{selectedInvoicePayments.length}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Customer</h4>
                <ul className="summary-list">
                  <li>
                    <span>Name</span>
                    <span>{selectedInvoice.customer}</span>
                  </li>
                  <li>
                    <span>Entity</span>
                    <span>Food service / retail partner</span>
                  </li>
                  <li>
                    <span>Region</span>
                    <span>APAC</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Line items</h3>
                  <span className="card-subtitle">Products and quantities invoiced</span>
                </div>
                <DataTable
                  columns={[
                    { key: 'sku', header: 'SKU' },
                    { key: 'description', header: 'Description' },
                    {
                      key: 'quantity',
                      header: 'Qty',
                      render: (v, row) => `${v.toLocaleString()} ${row.uom}`,
                    },
                    {
                      key: 'unitPrice',
                      header: 'Unit price',
                      render: (v) =>
                        `${selectedInvoice.currency} ${v.toLocaleString()}`,
                    },
                    {
                      key: 'lineTotal',
                      header: 'Line total',
                      render: (v) =>
                        `${selectedInvoice.currency} ${v.toLocaleString()}`,
                    },
                  ]}
                  data={selectedInvoiceLines}
                />
              </div>
            </section>

            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Payment history</h3>
                  <span className="card-subtitle">
                    All payments posted or in progress against this invoice
                  </span>
                </div>
                <DataTable
                  columns={[
                    { key: 'paymentNumber', header: 'Payment' },
                    { key: 'date', header: 'Date' },
                    { key: 'method', header: 'Method' },
                    {
                      key: 'amount',
                      header: 'Amount',
                      render: (value, row) =>
                        `${row.currency} ${value.toLocaleString()}`,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (value) => (
                        <Badge tone={value === 'Posted' ? 'success' : 'neutral'}>
                          {value}
                        </Badge>
                      ),
                    },
                  ]}
                  data={selectedInvoicePayments}
                />
              </div>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        open={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        title="Add journal entry"
        size="lg"
      >
        <form className="form-grid" onSubmit={handleJournalSubmit}>
          <label className="field">
            <span className="field-label">Date</span>
            <input
              type="date"
              className="input"
              value={journalForm.date}
              onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Reference</span>
            <input
              type="text"
              className="input"
              value={journalForm.reference}
              onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
              placeholder="E.g. INV-2404009, PAY-2402010"
            />
          </label>
          <label className="field field-full">
            <span className="field-label">Narration</span>
            <textarea
              className="input"
              rows={3}
              value={journalForm.description}
              onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
              placeholder="Short description of the journal entry"
            />
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select
              className="input input-select"
              value={journalForm.status}
              onChange={(e) => setJournalForm({ ...journalForm, status: e.target.value })}
            >
              <option value="Draft">Draft</option>
              <option value="Posted">Posted</option>
              <option value="Approved">Approved</option>
            </select>
          </label>

          <div className="field field-full">
            <span className="field-label">Line items</span>
            <div className="journal-lines">
              <div className="journal-lines-header">
                <span>Account</span>
                <span>Debit</span>
                <span>Credit</span>
                <span />
              </div>
              {journalForm.lines.map((line, index) => (
                <div key={index} className="journal-lines-row">
                  <select
                    className="input input-select"
                    value={line.accountCode}
                    onChange={(e) => handleJournalLineChange(index, 'accountCode', e.target.value)}
                  >
                    <option value="">Select account</option>
                    {ledgerAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} — {acc.displayName ?? acc.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    value={line.debit}
                    onChange={(e) => handleJournalLineChange(index, 'debit', e.target.value)}
                  />
                  <input
                    type="number"
                    className="input"
                    value={line.credit}
                    onChange={(e) => handleJournalLineChange(index, 'credit', e.target.value)}
                  />
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleJournalRemoveLine(index)}
                    disabled={journalForm.lines.length <= 2}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="button ghost" onClick={handleJournalAddLine}>
                Add line
              </button>
            </div>
          </div>

          <div className="field field-full">
            <div className="summary-list">
              <div>
                <span>Total debit</span>
                <span>{journalTotals.totalDebit.toLocaleString()}</span>
              </div>
              <div>
                <span>Total credit</span>
                <span>{journalTotals.totalCredit.toLocaleString()}</span>
              </div>
              <div>
                <span>Balance status</span>
                <span>
                  <Badge tone={journalTotals.balanced ? 'success' : 'danger'}>
                    {journalTotals.balanced ? 'Balanced' : 'Out of balance'}
                  </Badge>
                </span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setJournalModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save journal
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedJournal) && journalDetailOpen}
        onClose={() => {
          setJournalDetailOpen(false)
          setSelectedJournal(null)
        }}
        title={selectedJournal ? `Journal ${selectedJournal.journalNumber}` : 'Journal details'}
        size="lg"
      >
        {selectedJournal && (
          <div className="form-grid">
            <div className="card-header card-header-spaced">
              <div>
                <h3>{selectedJournal.reference || selectedJournal.journalNumber}</h3>
                <span className="card-subtitle">
                  {selectedJournal.date} • {selectedJournal.description}
                </span>
              </div>
              <Badge
                tone={
                  selectedJournal.status === 'Posted'
                    ? 'success'
                    : selectedJournal.status === 'Approved'
                      ? 'accent'
                      : 'warning'
                }
              >
                {selectedJournal.status}
              </Badge>
            </div>

            <section className="grid grid-3">
              <div>
                <h4>Header</h4>
                <ul className="summary-list">
                  <li>
                    <span>Journal number</span>
                    <span>{selectedJournal.journalNumber}</span>
                  </li>
                  <li>
                    <span>Date</span>
                    <span>{selectedJournal.date}</span>
                  </li>
                  <li>
                    <span>Reference</span>
                    <span>{selectedJournal.reference || 'N/A'}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Amounts</h4>
                <ul className="summary-list">
                  <li>
                    <span>Total debit</span>
                    <span>{selectedJournal.totalDebit.toLocaleString()}</span>
                  </li>
                  <li>
                    <span>Total credit</span>
                    <span>{selectedJournal.totalCredit.toLocaleString()}</span>
                  </li>
                  <li>
                    <span>Balanced</span>
                    <Badge tone={selectedJournal.balanced ? 'success' : 'danger'}>
                      {selectedJournal.balanced ? 'Yes' : 'No'}
                    </Badge>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Workflow</h4>
                <ul className="summary-list">
                  <li>
                    <span>Created by</span>
                    <span>{selectedJournal.createdBy}</span>
                  </li>
                  <li>
                    <span>Approved by</span>
                    <span>{selectedJournal.approvedBy ?? 'Not set'}</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Line items</h3>
                  <span className="card-subtitle">Debit and credit lines in this journal</span>
                </div>
                <DataTable
                  columns={[
                    { key: 'accountCode', header: 'Account code' },
                    { key: 'accountName', header: 'Account' },
                    {
                      key: 'debit',
                      header: 'Debit',
                      render: (v) => (v ? v.toLocaleString() : ''),
                    },
                    {
                      key: 'credit',
                      header: 'Credit',
                      render: (v) => (v ? v.toLocaleString() : ''),
                    },
                    {
                      key: 'linkType',
                      header: 'Source',
                    },
                  ]}
                  data={selectedJournal.lines}
                />
              </div>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(selectedLedgerRow) && ledgerDetailOpen}
        onClose={() => {
          setLedgerDetailOpen(false)
          setSelectedLedgerRow(null)
        }}
        title="Ledger transaction details"
        size="lg"
      >
        {selectedLedgerRow && (
          <div className="form-grid">
            <section className="grid grid-2">
              <div>
                <h4>Transaction</h4>
                <ul className="summary-list">
                  <li>
                    <span>Date</span>
                    <span>{selectedLedgerRow.date}</span>
                  </li>
                  <li>
                    <span>Journal number</span>
                    <span>{selectedLedgerRow.journalNumber}</span>
                  </li>
                  <li>
                    <span>Reference</span>
                    <span>{selectedLedgerRow.reference || 'N/A'}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Amounts</h4>
                <ul className="summary-list">
                  <li>
                    <span>Debit</span>
                    <span>{selectedLedgerRow.debit.toLocaleString()}</span>
                  </li>
                  <li>
                    <span>Credit</span>
                    <span>{selectedLedgerRow.credit.toLocaleString()}</span>
                  </li>
                  <li>
                    <span>Running balance</span>
                    <span>{selectedLedgerRow.balance.toLocaleString()}</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="grid grid-1">
              <div className="card">
                <div className="card-header">
                  <h3>Linked transactions</h3>
                  <span className="card-subtitle">
                    Derived from journal source such as invoice or payment.
                  </span>
                </div>
                {selectedLedgerRow.linkType === 'Invoice' && (
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
                      { key: 'status', header: 'Status' },
                    ]}
                    data={invoices.filter((inv) => inv.id === selectedLedgerRow.linkId)}
                  />
                )}
                {selectedLedgerRow.linkType === 'Payment' && (
                  <DataTable
                    columns={[
                      { key: 'paymentNumber', header: 'Payment' },
                      { key: 'invoiceId', header: 'Invoice ID' },
                      { key: 'date', header: 'Date' },
                      { key: 'method', header: 'Method' },
                      {
                        key: 'amount',
                        header: 'Amount',
                        render: (v, row) => `${row.currency} ${v.toLocaleString()}`,
                      },
                      { key: 'status', header: 'Status' },
                    ]}
                    data={payments.filter((p) => p.id === selectedLedgerRow.linkId)}
                  />
                )}
                {selectedLedgerRow.linkType !== 'Invoice' &&
                  selectedLedgerRow.linkType !== 'Payment' && (
                    <div className="empty-state">
                      This ledger row is linked to a manual or opening journal entry.
                    </div>
                  )}
              </div>
            </section>
          </div>
        )}
      </Modal>

      {canEdit && (
        <Modal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title="Add invoice"
        size="md"
      >
        <form className="form-grid" onSubmit={handleInvoiceSubmit}>
          <label className="field">
            <span className="field-label">Customer</span>
            <input
              type="text"
              className="input"
              value={invoiceForm.customer}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, customer: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Linked sales order (optional)</span>
            <input
              type="text"
              className="input"
              value={invoiceForm.orderId}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, orderId: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Currency</span>
            <select
              className="input input-select"
              value={invoiceForm.currency}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MYR">MYR</option>
              <option value="IDR">IDR</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Due date</span>
            <input
              type="date"
              className="input"
              value={invoiceForm.dueDate}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setInvoiceModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save invoice
            </button>
          </div>
        </form>
        </Modal>
      )}

      {canEdit && (
        <Modal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title="Record payment"
          size="md"
        >
          <form className="form-grid" onSubmit={handlePaymentSubmit}>
          <label className="field">
            <span className="field-label">Invoice</span>
            <select
              className="input input-select"
              value={paymentForm.invoiceId}
              onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
              required
            >
              <option value="">Select invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customer}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Currency</span>
            <select
              className="input input-select"
              value={paymentForm.currency}
              onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MYR">MYR</option>
              <option value="IDR">IDR</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Payment method</span>
            <select
              className="input input-select"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
            >
              <option value="Bank Transfer">Bank transfer</option>
              <option value="GIRO">GIRO</option>
              <option value="Wire Transfer">Wire transfer</option>
              <option value="Credit Card">Credit card</option>
            </select>
          </label>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Save payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
