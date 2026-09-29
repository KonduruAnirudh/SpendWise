import { useState } from 'react'
import { Upload } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CategorySuggestion } from '../../components/ai/CategorySuggestion'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { importService } from '../../services/importService'
import { categoryService } from '../../services/categoryService'
import { accountService } from '../../services/accountService'

const STEPS = ['Upload', 'Parse', 'Preview', 'Review', 'Confirm', 'Import']

export function ImportPage() {
  const { push } = useToast()
  const categories = useAsync(() => categoryService.list(), [])
  const accounts = useAsync(() => accountService.list(), [])
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file) {
    if (!file) return
    const allowed = /\.(csv|xlsx)$/i.test(file.name)
    if (!allowed) {
      push('Invalid file format.', 'error')
      return
    }
    setFileName(file.name)
    setStep(1)
    setLoading(true)
    try {
      const result = await importService.parse(file)
      setRows(result.transactions)
      setStep(2)
    } catch {
      push('Unable to parse this statement.', 'error')
      setStep(0)
    } finally {
      setLoading(false)
    }
  }

  async function confirmImport() {
    setStep(5)
    setLoading(true)
    try {
      await importService.confirm({ transactions: rows.filter((row) => !row.removed) })
      push('Statement imported successfully.')
      setStep(0)
      setRows([])
      setFileName('')
    } catch {
      push('Something went wrong.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Import statements"
        description="Upload a CSV or Excel file, review AI categories, then confirm."
      />
      <ol className="mb-8 flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-subtle">
        {STEPS.map((label, index) => (
          <li key={label} className={index <= step ? 'text-accent' : ''}>
            {label}
            {index < STEPS.length - 1 && <span className="mx-2 text-subtle">→</span>}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center ${
            dragging ? 'border-accent bg-accent-muted' : 'border-border bg-card'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            handleFile(event.dataTransfer.files[0])
          }}
        >
          <Upload className="mb-3 size-8 text-accent" />
          <p className="text-lg font-medium">Drop your statement here</p>
          <p className="mt-1 text-sm text-muted">or click to browse files</p>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-subtle">CSV · XLSX supported</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>
      )}

      {step >= 1 && (
        <Card className="mb-6">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">File detected</p>
          <p className="mt-1 text-lg font-semibold">{fileName}</p>
          <p className="mt-2 text-sm text-muted">
            {loading ? 'Parsing…' : `${rows.length} transactions found`}
          </p>
        </Card>
      )}

      {step >= 2 && rows.length > 0 && (
        <div className="space-y-3">
          {rows
            .filter((row) => !row.removed)
            .map((row) => (
              <CategorySuggestion
                key={row.id}
                row={row}
                categories={categories.data || []}
                accounts={accounts.data || []}
                onChange={(partial) =>
                  setRows((current) => current.map((item) => (item.id === row.id ? { ...item, ...partial } : item)))
                }
                onAccept={() => {
                  setRows((current) =>
                    current.map((item) => (item.id === row.id ? { ...item, accepted: true } : item)),
                  )
                  setStep(3)
                }}
                onRemove={() =>
                  setRows((current) => current.map((item) => (item.id === row.id ? { ...item, removed: true } : item)))
                }
              />
            ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setStep(0); setRows([]); }}>
              Cancel
            </Button>
            <Button
              loading={loading}
              onClick={() => {
                setStep(4)
                confirmImport()
              }}
            >
              Confirm import
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
