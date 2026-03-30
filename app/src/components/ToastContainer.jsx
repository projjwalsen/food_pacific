import { useToast } from '../context/ToastContext'

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.variant}`}>
          <div className="toast-message">{toast.message}</div>
          <button
            type="button"
            className="icon-button toast-close"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

