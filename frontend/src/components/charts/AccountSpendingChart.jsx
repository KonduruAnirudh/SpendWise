import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { formatCurrency } from '../../utils/formatters'

export function AccountSpendingChart({ data }) {
  const { resolved } = useTheme()
  const muted = resolved === 'dark' ? '#9c9a92' : '#6e6c64'
  const grid = resolved === 'dark' ? '#2a2a26' : '#e6e1d6'
  const tooltipBg = resolved === 'dark' ? '#161614' : '#ffffff'

  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No expenses in this period.</p>

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fill: muted, fontSize: 12 }} width={120} />
          <Tooltip
            contentStyle={{ background: tooltipBg, border: `1px solid ${grid}`, borderRadius: 12 }}
            formatter={(value) => formatCurrency(value)}
          />
          <Bar dataKey="amount" fill="#c9a227" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
