import { PageHeader } from '../components/PageHeader'

export function AccessDeniedPage() {
  return (
    <div className="page">
      <PageHeader
        title="Access denied"
        subtitle="Your current role does not have permission to open this workspace."
      />
      <section className="grid grid-1">
        <div className="card">
          <div className="card-header">
            <h3>How to proceed</h3>
          </div>
          <ul className="summary-list">
            <li>
              <span>Switch to a different workspace that you can access from the sidebar.</span>
            </li>
            <li>
              <span>Contact an Admin or Operations Manager if you believe you should have access.</span>
            </li>
            <li>
              <span>Use the Dashboard and Reports areas for cross-module read-only insights.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}

