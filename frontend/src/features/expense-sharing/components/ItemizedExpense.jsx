import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { formatCurrency } from '../../../utils/formatters'
import { cn } from '../../../utils/cn'

export function ItemizedExpense({ members, items, tax, tip, total, onItems, onTax, onTip, onAdd, errors }) {
  function updateItem(id, partial) {
    onItems(items.map((item) => (item.id === id ? { ...item, ...partial } : item)))
  }

  function togglePerson(item, personId) {
    const assigned = new Set(item.assignedPersonIds || [])
    if (assigned.has(personId)) assigned.delete(personId)
    else assigned.add(personId)
    updateItem(item.id, { assignedPersonIds: [...assigned] })
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-hover text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              {members.map((member) => (
                <th key={member.id} className="px-2 py-2 text-center font-medium">
                  {member.name}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <input
                    className="h-9 w-full rounded-lg border border-border bg-surface px-2"
                    value={item.name}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                    placeholder="Item"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-right"
                    value={item.amount}
                    onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })}
                  />
                </td>
                {members.map((member) => (
                  <td key={member.id} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={(item.assignedPersonIds || []).includes(member.id)}
                      onChange={() => togglePerson(item, member.id)}
                      aria-label={`Assign ${item.name || 'item'} to ${member.name}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted hover:text-danger"
                    onClick={() => onItems(items.filter((row) => row.id !== item.id))}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border p-3">
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-lg border border-border bg-surface px-2 text-sm"
                value={item.name}
                placeholder="Item"
                onChange={(event) => updateItem(item.id, { name: event.target.value })}
              />
              <input
                type="number"
                className="h-10 w-24 rounded-lg border border-border bg-surface px-2 text-right text-sm"
                value={item.amount}
                onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })}
              />
              <button type="button" className="text-muted" onClick={() => onItems(items.filter((row) => row.id !== item.id))}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => togglePerson(item, member.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs',
                    (item.assignedPersonIds || []).includes(member.id)
                      ? 'border-accent bg-accent-muted text-accent'
                      : 'border-border text-muted',
                  )}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        <Plus className="size-3.5" /> Add item
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="number" label="Tax" value={tax} onChange={(event) => onTax(Number(event.target.value) || 0)} />
        <Input type="number" label="Tip" value={tip} onChange={(event) => onTip(Number(event.target.value) || 0)} />
      </div>
      <p className="text-sm font-medium">Total {formatCurrency(total)}</p>
      {errors.splits && <p className="text-xs text-danger">{errors.splits}</p>}
    </div>
  )
}
