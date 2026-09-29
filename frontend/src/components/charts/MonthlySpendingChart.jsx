import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { formatCurrency } from '../../utils/formatters'

export function MonthlySpendingChart({ data }) {
  const { resolved } = useTheme()
  const muted = resolved === 'dark' ? '#9c9a92' : '#6e6c64'
  const grid = resolved === 'dark' ? '#2a2a26' : '#e6e1d6'
  const tooltipBg = resolved === 'dark' ? '#161614' : '#ffffff'

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: muted, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip
            contentStyle={{ background: tooltipBg, border: `1px solid ${grid}`, borderRadius: 12 }}
            formatter={(value) => formatCurrency(value)}
          />
          <Bar dataKey="expenses" fill="#d4af37" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
