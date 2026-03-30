import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useErp } from '../context/ErpContext'
import { useToast } from '../context/ToastContext'

export function FinancePage() {
  const { invoices, payments, purchaseOrders, addInvoice, addPayment } = useErp()
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
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
                render: (value) => <Badge tone={value === 'Posted' ? 'success' : 'neutral'}>{value}</Badge>,
              },
            ]}
            data={payments}
          />
        </div>
      </section>

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
            <button type="button" className="button ghost" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

