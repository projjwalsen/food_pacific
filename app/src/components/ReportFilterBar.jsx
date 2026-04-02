export function ReportFilterBar({
  period,
  onPeriodChange,
  year,
  onYearChange,
  extraFilters,
  onExtraFilterChange,
  onExport,
  onPrint,
}) {
  const periods = [
    { value: 'mtd', label: 'Month to date' },
    { value: 'qtd', label: 'Quarter to date' },
    { value: 'ytd', label: 'Year to date' },
  ]

  const years = ['2024', '2025', '2026']

  return (
    <div className="report-filter-bar">
      <div className="report-filter-group">
        <select
          className="input input-select"
          value={period}
          onChange={(e) => onPeriodChange?.(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="input input-select"
          value={year}
          onChange={(e) => onYearChange?.(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              FY {y}
            </option>
          ))}
        </select>
        {extraFilters?.map((filter) => (
          <select
            key={filter.key}
            className="input input-select"
            value={filter.value}
            onChange={(e) => onExtraFilterChange?.(filter.key, e.target.value)}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="report-filter-actions">
        <button type="button" className="button ghost" onClick={onExport}>
          Export
        </button>
        <button type="button" className="button ghost" onClick={onPrint}>
          Print
        </button>
      </div>
    </div>
  )
}

