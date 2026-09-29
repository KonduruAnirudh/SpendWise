import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function TransactionTable({ rows, lookup, onEdit, onDelete, dateFormat }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-hover text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              {['Date', 'Description', 'Category', 'Account', 'Type', 'Amount', ''].map((col) => (
                <th key={col} className="px-4 py-3 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted">{formatDate(row.date, dateFormat)}</td>
                <td className="px-4 py-3 font-medium">{row.description}</td>
                <td className="px-4 py-3 text-muted">{lookup.category(row.categoryId)}</td>
                <td className="px-4 py-3 text-muted">{lookup.account(row.accountId)}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.type === 'income' ? 'success' : 'danger'}>{row.type}</Badge>
                </td>
                <td className={`px-4 py-3 font-medium ${row.type === 'income' ? 'text-success' : ''}`}>
                  {row.type === 'income' ? '+' : '−'} {formatCurrency(row.amount)}
                </td>
                <td className="px-4 py-3">
                  <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.description}</p>
                <p className="text-xs text-muted">
                  {lookup.category(row.categoryId)} · {formatDate(row.date, dateFormat)}
                </p>
              </div>
              <p className={`font-semibold ${row.type === 'income' ? 'text-success' : ''}`}>
                {row.type === 'income' ? '+' : '−'} {formatCurrency(row.amount)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-subtle">
                {lookup.account(row.accountId)}
              </p>
              <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg" aria-label="Edit">
        <Pencil className="size-4" />
      </button>
      <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-danger" aria-label="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
