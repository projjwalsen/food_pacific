export function ReportCard({ label, value, sublabel, tone = 'neutral', align = 'left' }) {
  return (
    <div className={`card report-card report-card-${tone}`}>
      <div className="report-card-label">{label}</div>
      <div className="report-card-value" style={{ textAlign: align }}>
        {value}
      </div>
      {sublabel ? <div className="report-card-sublabel">{sublabel}</div> : null}
    </div>
  )
}

