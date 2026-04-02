import { Modal } from './Modal'

export function DrilldownModal({ open, onClose, title, subtitle, size = 'lg', children, footer }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size={size}>
      <div className="drilldown-modal-body">
        {subtitle ? <div className="drilldown-modal-subtitle">{subtitle}</div> : null}
        {children}
      </div>
      {footer ? <div className="drilldown-modal-footer">{footer}</div> : null}
    </Modal>
  )
}

