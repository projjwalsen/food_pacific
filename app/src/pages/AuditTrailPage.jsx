import { useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { useErp } from '../context/ErpContext'

export function AuditTrailPage() {
  const { auditLogs } = useErp()

  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')

  const modules = useMemo(
    () => Array.from(new Set(auditLogs.map((a) => a.module))).sort(),
    [auditLogs],
  )

  const filtered = useMemo(
    () =>
      auditLogs.filter((a) => {
        const matchesModule = moduleFilter === 'all' || a.module === moduleFilter
        const matchesSearch =
          !search ||
          a.action.toLowerCase().includes(search.toLowerCase()) ||
          a.details.toLowerCase().includes(search.toLowerCase()) ||
          a.user.toLowerCase().includes(search.toLowerCase())
        return matchesModule && matchesSearch
      }),
    [auditLogs, moduleFilter, search],
  )

  function handleFilterChange(key, value) {
    if (key === 'module') setModuleFilter(value)
  }

  return (
    <div className="page">
      <PageHeader
        title="Audit trail"
        subtitle="System-wide timeline of approvals, postings, and security events."
      />

      <div className="card">
        <div className="card-header">
          <h3>Activity timeline</h3>
          <span className="card-subtitle">Filter by module or keyword</span>
        </div>
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          filters={[
            {
              key: 'module',
              value: moduleFilter,
              options: [{ value: 'all', label: 'All modules' }].concat(
                modules.map((m) => ({ value: m, label: m })),
              ),
            },
          ]}
          onFilterChange={handleFilterChange}
          placeholder="Search by user, action, or details"
        />
        <ul className="timeline">
          {filtered.map((entry) => (
            <li key={entry.id} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-module">{entry.module}</span>
                  <span className="timeline-time">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <div className="timeline-title">
                  {entry.action}{' '}
                  <Badge
                    tone={
                      entry.severity === 'Success'
                        ? 'success'
                        : entry.severity === 'Warning'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {entry.severity}
                  </Badge>
                </div>
                <div className="timeline-body">{entry.details}</div>
                <div className="timeline-meta">
                  Performed by <strong>{entry.user}</strong> · {entry.role}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

