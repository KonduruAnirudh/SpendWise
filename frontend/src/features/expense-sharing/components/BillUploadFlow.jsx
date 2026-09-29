import { Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { formatCurrency } from '../../../utils/formatters'
import { generateId } from '../../../utils/formatters'

export function BillUploadFlow({ flow, onContinue }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="space-y-5">
      {flow.status === 'idle' && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center ${
            dragging ? 'border-accent bg-accent-muted' : 'border-border hover:border-accent/40'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) flow.upload(file)
          }}
        >
          <Upload className="mb-3 size-7 text-accent" />
          <p className="font-medium">Drag & drop your bill here</p>
          <p className="mt-1 text-sm text-muted">or choose a file</p>
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-subtle">JPG · JPEG · PNG · PDF</p>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) flow.upload(file)
            }}
          />
        </label>
      )}

      {flow.status !== 'idle' && flow.status !== 'review' && flow.status !== 'split' && (
        <div className="space-y-3">
          {flow.steps.map((step, index) => (
            <p key={step.key} className={`text-sm ${index <= flow.stepIndex ? 'text-accent' : 'text-subtle'}`}>
              {index < flow.stepIndex ? '✓' : index === flow.stepIndex ? '●' : '○'} {step.label}
            </p>
          ))}
        </div>
      )}

      {flow.status === 'review' && flow.bill && (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Extracted bill · {flow.bill.fileName}</p>
          <ul className="space-y-2">
            {flow.bill.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
                <input
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
                  value={item.name}
                  onChange={(event) =>
                    flow.updateBill({
                      items: flow.bill.items.map((row) => (row.id === item.id ? { ...row, name: event.target.value } : row)),
                    })
                  }
                />
                <input
                  type="number"
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-right text-sm"
                  value={item.amount}
                  onChange={(event) =>
                    flow.updateBill({
                      items: flow.bill.items.map((row) =>
                        row.id === item.id ? { ...row, amount: Number(event.target.value) } : row,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="text-xs text-muted hover:text-danger"
                  onClick={() => flow.updateBill({ items: flow.bill.items.filter((row) => row.id !== item.id) })}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              flow.updateBill({
                items: [...flow.bill.items, { id: generateId('item'), name: '', amount: 0 }],
              })
            }
          >
            Add item
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="number" label="Tax" value={flow.bill.tax} onChange={(event) => flow.updateBill({ tax: Number(event.target.value) || 0 })} />
            <Input type="number" label="Tip" value={flow.bill.tip} onChange={(event) => flow.updateBill({ tip: Number(event.target.value) || 0 })} />
          </div>
          <div className="rounded-xl border border-border px-4 py-3 text-sm">
            <p className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(flow.bill.subtotal)}</span>
            </p>
            <p className="mt-2 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(flow.bill.total)}</span>
            </p>
          </div>
          <Button type="button" onClick={onContinue}>
            Confirm extracted bill
          </Button>
        </div>
      )}

      {flow.error && <p className="text-sm text-danger">{flow.error}</p>}
    </div>
  )
}
