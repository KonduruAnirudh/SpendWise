import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { BILL_ACCEPT } from '../../../services/billService'

// Choose or drop a bill; shows progress while the model reads it. The draft is reviewed in the
// itemized expense form afterwards.
export function BillUploadFlow({ flow }) {
  const [dragging, setDragging] = useState(false)

  if (flow.status === 'reading') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border px-6 py-12 text-center" role="status">
        <Loader2 className="mb-3 size-7 animate-spin text-accent" />
        <p className="font-medium">Reading {flow.fileName || 'your bill'}…</p>
        <p className="mt-1 text-sm text-muted">{flow.elapsed > 0 ? `${flow.elapsed}s` : ''}</p>
        {flow.elapsed >= 10 && (
          <p className="mt-2 max-w-sm text-xs text-subtle">
            The first bill can take up to a minute while the model loads. Nothing is saved until you confirm the split.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
        <p className="mt-1 text-sm text-muted">or choose a photo or PDF</p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-subtle">JPG · PNG · WebP · PDF · up to 5 MB</p>
        <input
          type="file"
          accept={BILL_ACCEPT}
          className="hidden"
          aria-label="Choose a bill to upload"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) flow.upload(file)
          }}
        />
      </label>
      <p className="text-xs text-subtle">
        The bill is read by the AI model and returned as a draft. You check every line before anything is saved.
      </p>
      {flow.error && (
        <p className="rounded-xl border border-danger/30 px-3 py-2 text-sm text-danger" role="alert">
          {flow.error}
        </p>
      )}
    </div>
  )
}
