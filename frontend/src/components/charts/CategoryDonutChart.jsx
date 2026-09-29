import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CATEGORY_COLORS } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'
import { useTheme } from '../../context/ThemeContext'

export function CategoryDonutChart({ data }) {
  const { resolved } = useTheme()
  const tooltipBg = resolved === 'dark' ? '#161614' : '#ffffff'
  const border = resolved === 'dark' ? '#2a2a26' : '#e6e1d6'

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-full sm:w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9c9a92'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: tooltipBg, border: `1px solid ${border}`, borderRadius: 12 }}
              formatter={(value) => formatCurrency(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted">
              <span
                className="size-2.5 rounded-full"
                style={{ background: CATEGORY_COLORS[entry.name] || '#9c9a92' }}
              />
              {entry.name}
            </span>
            <span className="font-medium">{formatCurrency(entry.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
