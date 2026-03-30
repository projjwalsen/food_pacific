import { createPortal } from 'react-dom'

function ensureRoot() {
  let el = document.getElementById('modal-root')
  if (!el) {
    el = document.createElement('div')
    el.id = 'modal-root'
    document.body.appendChild(el)
  }
  return el
}

export function Modal({ open, title, onClose, children, size = 'md' }) {
  if (!open) return null
  const root = ensureRoot()

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal-panel modal-panel-${size}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    root,
  )
}

