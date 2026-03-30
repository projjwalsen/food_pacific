export function SearchFilterBar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  placeholder = 'Search...',
}) {
  return (
    <div className="search-filter-bar">
      <input
        type="search"
        className="input"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {filters?.length ? (
        <div className="filter-group">
          {filters.map((filter) => (
            <select
              key={filter.key}
              className="input input-select"
              value={filter.value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      ) : null}
    </div>
  )
}

