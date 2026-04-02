import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function RevenueTrendChart({ data }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Revenue Trend</h3>
        <span className="chart-subtitle">Last 6 months</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                <stop offset="80%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#7c3aed"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ProductSplitChart({ data }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Product Mix</h3>
        <span className="chart-subtitle">By category</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function DonutChartCard({ title, subtitle, data }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{title}</h3>
        {subtitle ? <span className="chart-subtitle">{subtitle}</span> : null}
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Tooltip />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

