import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'
import { canEditModule } from '../utils/permissions'

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
  const { invoices, payments, purchaseOrders, addInvoice, addPayment } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('ar_ap')
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
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

  const glData = [
    { account: '1001', name: 'Main Operating Bank', balance: 145000, type: 'Asset' },
    { account: '1100', name: 'Accounts Receivable', balance: summary.receivables, type: 'Asset' },
    { account: '1200', name: 'Inventory Asset', balance: 84000, type: 'Asset' },
    { account: '2100', name: 'Accounts Payable', balance: summary.payables, type: 'Liability' },
    { account: '3100', name: 'Retained Earnings', balance: summary.actual, type: 'Equity' },
    { account: '4100', name: 'Sales Revenue', balance: summary.totalRevenue, type: 'Income' },
  ]

  const fixedAssets = [
    { id: 'FA-001', name: 'Sauce Line 1', value: 450000, depreciation: 45000, net: 405000 },
    { id: 'FA-002', name: 'Sauce Line 2', value: 380000, depreciation: 38000, net: 342000 },
    { id: 'FA-003', name: 'Main FG Warehouse', value: 1200000, depreciation: 24000, net: 1176000 },
  ]

  const bankRec = [
    { date: '2026-03-31', reference: 'Statement Ending Balance', amount: 148500, type: 'Statement' },
    { date: '2026-04-01', reference: 'Outstanding Check #1042', amount: -2500, type: 'Adjustment' },
    { date: '2026-04-01', reference: 'Deposit in Transit', amount: 1000, type: 'Adjustment' },
    { date: '2026-04-01', reference: 'Adjusted Bank Balance', amount: 147000, type: 'Total' },
  ]

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

      <section className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'ar_ap' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ar_ap')}
          >
            Receivables & Payables
          </button>
          <button
            className={`tab ${activeTab === 'gl' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('gl')}
          >
            General Ledger
          </button>
          <button
            className={`tab ${activeTab === 'bank' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            Bank Reconciliation
          </button>
          <button
            className={`tab ${activeTab === 'assets' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            Fixed Assets
          </button>
        </div>
      </section>

      {activeTab === 'ar_ap' && (
        <section className="grid grid-2">
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

      {activeTab === 'gl' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>General Ledger Summary</h3>
              <span className="card-subtitle">Trial balance snapshot</span>
            </div>
            <DataTable
              columns={[
                { key: 'account', header: 'Account #' },
                { key: 'name', header: 'Account Name' },
                { key: 'type', header: 'Type' },
                {
                  key: 'balance',
                  header: 'Balance (SGD)',
                  render: (v) => v.toLocaleString(),
                },
              ]}
              data={glData}
            />
          </div>
        </section>
      )}

      {activeTab === 'bank' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Bank Reconciliation</h3>
              <span className="card-subtitle">Last reconciled: 2026-03-31</span>
            </div>
            <DataTable
              columns={[
                { key: 'date', header: 'Date' },
                { key: 'reference', header: 'Reference' },
                { key: 'type', header: 'Type' },
                {
                  key: 'amount',
                  header: 'Amount (SGD)',
                  render: (v) => (
                    <span style={{ color: v < 0 ? 'var(--danger)' : 'inherit' }}>
                      {v.toLocaleString()}
                    </span>
                  ),
                },
              ]}
              data={bankRec}
            />
          </div>
        </section>
      )}

      {activeTab === 'assets' && (
        <section className="grid grid-1">
          <div className="card">
            <div className="card-header">
              <h3>Fixed Assets</h3>
              <span className="card-subtitle">Plant, Property & Equipment</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', header: 'Asset ID' },
                { key: 'name', header: 'Asset Name' },
                { key: 'value', header: 'Original Value', render: (v) => v.toLocaleString() },
                { key: 'depreciation', header: 'Accum. Depr.', render: (v) => v.toLocaleString() },
                { key: 'net', header: 'Net Book Value', render: (v) => v.toLocaleString() },
              ]}
              data={fixedAssets}
            />
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
