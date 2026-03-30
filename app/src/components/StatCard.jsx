export function StatCard({ label, value, trend, tone = 'primary' }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {trend ? <div className="stat-trend">{trend}</div> : null}
    </div>
  )
}

