import { createContext, useContext, useEffect, useState } from 'react'
import {
  auditLogs as initialAuditLogs,
  demoUsers,
  invoices as initialInvoices,
  inventoryItems as initialInventory,
  initialSettings,
  notifications as initialNotifications,
  payments as initialPayments,
  productionOrders as initialProductionOrders,
  purchaseOrders as initialPurchaseOrders,
  purchaseRequisitions as initialRequisitions,
  salesOrders as initialSalesOrders,
  suppliers as initialSuppliers,
} from '../data/dummyData'
import { loadErpState, saveErpState } from '../utils/storage'

const ErpContext = createContext(null)

function buildInitialState() {
  const persisted = typeof window !== 'undefined' ? loadErpState() : null
  if (persisted) return persisted

  return {
    users: demoUsers,
    suppliers: initialSuppliers,
    inventory: initialInventory,
    purchaseRequisitions: initialRequisitions,
    purchaseOrders: initialPurchaseOrders,
    productionOrders: initialProductionOrders,
    salesOrders: initialSalesOrders,
    invoices: initialInvoices,
    payments: initialPayments,
    auditLogs: initialAuditLogs,
    notifications: initialNotifications,
    settings: initialSettings,
  }
}

export function ErpProvider({ children }) {
  const [state, setState] = useState(buildInitialState)

  useEffect(() => {
    saveErpState(state)
  }, [state])

  function logAudit({ module, action, details, severity = 'Info', user }) {
    const entry = {
      id: `a-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user?.name ?? 'System',
      role: user?.role ?? 'System',
      module,
      action,
      details,
      severity,
    }

    setState((prev) => ({
      ...prev,
      auditLogs: [entry, ...prev.auditLogs].slice(0, 200),
    }))
  }

  function addNotification(message, type = 'Info') {
    const entry = {
      id: `n-${Date.now()}`,
      type,
      message,
      timeAgo: 'Just now',
    }
    setState((prev) => ({
      ...prev,
      notifications: [entry, ...prev.notifications].slice(0, 50),
    }))
  }

  function createRequisition(requisition, user) {
    const id = `pr-${Date.now()}`
    const reqNumber = `PR-${String(Math.floor(Math.random() * 900000) + 100000)}`

    const record = {
      id,
      status: 'Pending Approval',
      ...requisition,
      reqNumber,
    }

    setState((prev) => ({
      ...prev,
      purchaseRequisitions: [record, ...prev.purchaseRequisitions],
    }))

    logAudit({
      module: 'Procurement',
      action: 'Requisition Submitted',
      details: `Requisition ${reqNumber} submitted for ${record.quantity} ${record.uom} of item ${record.itemId}.`,
      severity: 'Info',
      user,
    })

    addNotification(`New purchase requisition ${reqNumber} created.`, 'Approval')
  }

  function updateRequisitionStatus(id, status, user) {
    setState((prev) => ({
      ...prev,
      purchaseRequisitions: prev.purchaseRequisitions.map((pr) =>
        pr.id === id ? { ...pr, status } : pr,
      ),
    }))

    logAudit({
      module: 'Procurement',
      action: `Requisition ${status}`,
      details: `Requisition ${id} updated to status ${status}.`,
      severity: status === 'Rejected' ? 'Warning' : 'Success',
      user,
    })
  }

  function createPurchaseOrderFromRequisition(requisitionId, user) {
    setState((prev) => {
      const requisition = prev.purchaseRequisitions.find((r) => r.id === requisitionId)
      if (!requisition) return prev

      const supplier = prev.suppliers.find((s) => s.id === requisition.supplierId)
      const poNumber = `PO-${String(Math.floor(Math.random() * 9000000) + 1000000)}`

      const newPo = {
        id: `po-${Date.now()}`,
        poNumber,
        supplierId: requisition.supplierId,
        reqId: requisition.id,
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: requisition.requiredDate,
        status: 'Open',
        currency: 'SGD',
        amount: Math.round(Math.random() * 30000 + 8000),
        supplierName: supplier?.name,
      }

      logAudit({
        module: 'Procurement',
        action: 'PO Created',
        details: `Purchase order ${poNumber} created from requisition ${requisition.reqNumber}.`,
        severity: 'Success',
        user,
      })

      addNotification(`PO ${poNumber} issued to ${supplier?.name ?? 'supplier'}.`, 'Procurement')

      return {
        ...prev,
        purchaseOrders: [newPo, ...prev.purchaseOrders],
      }
    })
  }

  function receivePurchaseOrder(poId, user) {
    setState((prev) => {
      const po = prev.purchaseOrders.find((p) => p.id === poId)
      if (!po) return prev
      const requisition = prev.purchaseRequisitions.find((r) => r.id === po.reqId)
      if (!requisition) {
        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, status: 'Received' } : p,
          ),
        }
      }

      const updatedInventory = prev.inventory.map((item) => {
        if (item.id !== requisition.itemId) return item
        return {
          ...item,
          onHand: item.onHand + requisition.quantity,
        }
      })

      logAudit({
        module: 'Inventory',
        action: 'Goods Receipt',
        details: `Goods receipt posted for PO ${po.poNumber}, item ${requisition.itemId}.`,
        severity: 'Success',
        user,
      })

      addNotification(`Goods received for PO ${po.poNumber}. Inventory updated.`, 'Inventory')

      return {
        ...prev,
        inventory: updatedInventory,
        purchaseOrders: prev.purchaseOrders.map((p) =>
          p.id === poId ? { ...p, status: 'Received' } : p,
        ),
      }
    })
  }

  function adjustInventory(itemId, delta, reason, user) {
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((item) =>
        item.id === itemId
          ? {
              ...item,
              onHand: Math.max(0, item.onHand + delta),
            }
          : item,
      ),
    }))

    logAudit({
      module: 'Inventory',
      action: 'Stock Adjustment',
      details: `Adjustment of ${delta} applied to ${itemId}. Reason: ${reason}.`,
      severity: 'Info',
      user,
    })
  }

  function createProductionOrder(order, user) {
    const id = `pro-${Date.now()}`
    const orderNumber = `PRO-${String(Math.floor(Math.random() * 9000000) + 1000000)}`

    const record = {
      id,
      orderNumber,
      status: 'Planned',
      producedQty: 0,
      startDate: order.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: null,
      efficiency: null,
      ...order,
    }

    setState((prev) => ({
      ...prev,
      productionOrders: [record, ...prev.productionOrders],
    }))

    logAudit({
      module: 'Production',
      action: 'Production Order Created',
      details: `Production order ${orderNumber} created for product ${order.productId}.`,
      severity: 'Info',
      user,
    })
  }

  function updateProductionStatus(id, status, producedQty, user) {
    setState((prev) => {
      const order = prev.productionOrders.find((p) => p.id === id)
      if (!order) return prev

      let inventory = prev.inventory
      const now = new Date().toISOString().slice(0, 10)

      if (status === 'Completed' && order.status !== 'Completed') {
        const qty = producedQty ?? order.plannedQty

        inventory = inventory.map((item) => {
          if (item.id === order.productId) {
            return { ...item, onHand: item.onHand + qty }
          }
          const raw = order.rawMaterials?.find((rm) => rm.itemId === item.id)
          if (raw) {
            return { ...item, onHand: Math.max(0, item.onHand - raw.quantity) }
          }
          return item
        })

        logAudit({
          module: 'Production',
          action: 'Order Completed',
          details: `Production order ${order.orderNumber} completed. ${qty} ${order.uom} produced.`,
          severity: 'Success',
          user,
        })

        addNotification(
          `Production order ${order.orderNumber} completed. Inventory updated.`,
          'Production',
        )
      }

      return {
        ...prev,
        inventory,
        productionOrders: prev.productionOrders.map((po) =>
          po.id === id
            ? {
                ...po,
                status,
                producedQty: producedQty ?? po.producedQty,
                endDate: status === 'Completed' ? now : po.endDate,
              }
            : po,
        ),
      }
    })
  }

  function createSalesOrder(order, user) {
    const id = `so-${Date.now()}`
    const orderNumber = `SO-${String(Math.floor(Math.random() * 9000000) + 1000000)}`

    const record = {
      id,
      orderNumber,
      status: 'Confirmed',
      orderDate: order.orderDate ?? new Date().toISOString().slice(0, 10),
      ...order,
    }

    setState((prev) => {
      const inventory = prev.inventory.map((item) => {
        const line = record.items?.find((i) => i.itemId === item.id)
        if (!line) return item
        return {
          ...item,
          onHand: Math.max(0, item.onHand - line.quantity),
          reserved: item.reserved + line.quantity,
        }
      })

      return {
        ...prev,
        inventory,
        salesOrders: [record, ...prev.salesOrders],
      }
    })

    logAudit({
      module: 'Sales',
      action: 'Sales Order Created',
      details: `Sales order ${orderNumber} created for customer ${order.customer}.`,
      severity: 'Info',
      user,
    })
  }

  function updateSalesStatus(id, status, user) {
    setState((prev) => ({
      ...prev,
      salesOrders: prev.salesOrders.map((so) =>
        so.id === id
          ? {
              ...so,
              status,
            }
          : so,
      ),
    }))

    logAudit({
      module: 'Sales',
      action: 'Sales Order Updated',
      details: `Sales order ${id} updated to status ${status}.`,
      severity: 'Info',
      user,
    })
  }

  function addInvoice(invoice, user) {
    const id = `inv-${Date.now()}`
    const invoiceNumber = `INV-${String(Math.floor(Math.random() * 9000000) + 1000000)}`
    const record = {
      id,
      invoiceNumber,
      status: 'Unpaid',
      issueDate: invoice.issueDate ?? new Date().toISOString().slice(0, 10),
      ...invoice,
    }

    setState((prev) => ({
      ...prev,
      invoices: [record, ...prev.invoices],
    }))

    logAudit({
      module: 'Finance',
      action: 'Invoice Created',
      details: `Invoice ${invoiceNumber} created for ${invoice.customer}.`,
      severity: 'Info',
      user,
    })
  }

  function addPayment(payment, user) {
    const id = `pay-${Date.now()}`
    const paymentNumber = `PAY-${String(Math.floor(Math.random() * 9000000) + 1000000)}`
    const record = {
      id,
      paymentNumber,
      status: 'Posted',
      date: payment.date ?? new Date().toISOString().slice(0, 10),
      ...payment,
    }

    setState((prev) => {
      const payments = [record, ...prev.payments]
      const invoices = prev.invoices.map((inv) => {
        if (inv.id !== payment.invoiceId) return inv
        const paidTotal = payments
          .filter((p) => p.invoiceId === inv.id && p.status === 'Posted')
          .reduce((sum, p) => sum + p.amount, 0)
        let status = 'Unpaid'
        if (paidTotal === 0) status = 'Unpaid'
        else if (paidTotal < inv.amount) status = 'Partially Paid'
        else status = 'Paid'
        return { ...inv, status }
      })

      return {
        ...prev,
        payments,
        invoices,
      }
    })

    logAudit({
      module: 'Finance',
      action: 'Payment Posted',
      details: `Payment ${paymentNumber} posted for invoice ${payment.invoiceId}.`,
      severity: 'Success',
      user,
    })
  }

  function addUser(userData, user) {
    const id = `u-${Date.now()}`
    const record = {
      id,
      status: 'Active',
      ...userData,
    }

    setState((prev) => ({
      ...prev,
      users: [...prev.users, record],
    }))

    logAudit({
      module: 'Users',
      action: 'User Created',
      details: `New user ${record.name} created with role ${record.role}.`,
      severity: 'Info',
      user,
    })
  }

  function updateUser(id, updates, user) {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    }))

    logAudit({
      module: 'Users',
      action: 'User Updated',
      details: `User ${id} updated.`,
      severity: 'Info',
      user,
    })
  }

  function updateSettings(updates, user) {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
        company: { ...prev.settings.company, ...(updates.company ?? {}) },
        notifications: {
          ...prev.settings.notifications,
          ...(updates.notifications ?? {}),
        },
        preferences: {
          ...prev.settings.preferences,
          ...(updates.preferences ?? {}),
        },
        security: {
          ...prev.settings.security,
          ...(updates.security ?? {}),
        },
      },
    }))

    logAudit({
      module: 'Settings',
      action: 'Settings Updated',
      details: 'ERP settings updated.',
      severity: 'Info',
      user,
    })
  }

  return (
    <ErpContext.Provider
      value={{
        state,
        suppliers: state.suppliers,
        inventory: state.inventory,
        purchaseRequisitions: state.purchaseRequisitions,
        purchaseOrders: state.purchaseOrders,
        productionOrders: state.productionOrders,
        salesOrders: state.salesOrders,
        invoices: state.invoices,
        payments: state.payments,
        auditLogs: state.auditLogs,
        notifications: state.notifications,
        settings: state.settings,
        users: state.users,
        createRequisition,
        updateRequisitionStatus,
        createPurchaseOrderFromRequisition,
        receivePurchaseOrder,
        adjustInventory,
        createProductionOrder,
        updateProductionStatus,
        createSalesOrder,
        updateSalesStatus,
        addInvoice,
        addPayment,
        addUser,
        updateUser,
        updateSettings,
        logAudit,
      }}
    >
      {children}
    </ErpContext.Provider>
  )
}

export function useErp() {
  const ctx = useContext(ErpContext)
  if (!ctx) {
    throw new Error('useErp must be used within ErpProvider')
  }
  return ctx
}
