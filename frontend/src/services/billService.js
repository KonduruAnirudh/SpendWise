import { api } from './api'
import { generateId } from '../utils/formatters'
import { fromPaise, toPaise } from '../utils/splitCalculations'

// Mirrors the server's limits, so obvious mistakes fail instantly. The server re-checks both
// (the type from the file's bytes, not its name).
export const MAX_BILL_BYTES = 5 * 1024 * 1024
export const BILL_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const BILL_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf'

// ---------- Adapter: BillDraft (API) → shape the itemized expense form uses ----------
export function toUiBillDraft(apiDraft) {
  return {
    merchant: apiDraft.merchant,
    billDate: apiDraft.bill_date,
    currency: apiDraft.currency,
    items: apiDraft.items.map((item) => ({ id: generateId('item'), name: item.name, amount: Number(item.amount) })),
    tax: Number(apiDraft.tax),
    tip: Number(apiDraft.tip),
    total: apiDraft.total === null ? null : Number(apiDraft.total),
    warnings: apiDraft.warnings,
  }
}

// Up to this much difference from the printed total is round-off (matches the server's tolerance).
const ROUND_OFF_PAISE = 100

// Draft items plus one "Tax & service" line for tax + tip, so it can be assigned like any item.
// A small round-off (e.g. -0.51) is folded into that line, so the expense equals what was paid.
export function draftToItemizedLines(draft) {
  const lines = draft.items.map((item) => ({ ...item }))
  const itemsPaise = lines.reduce((sum, item) => sum + toPaise(item.amount), 0)
  let extrasPaise = toPaise(draft.tax) + toPaise(draft.tip)
  let name = 'Tax & service'

  if (draft.total !== null) {
    const roundOff = toPaise(draft.total) - (itemsPaise + extrasPaise)
    if (roundOff !== 0 && Math.abs(roundOff) <= ROUND_OFF_PAISE && extrasPaise + roundOff > 0) {
      name = extrasPaise > 0 ? 'Tax & service (incl. round-off)' : 'Round-off'
      extrasPaise += roundOff
    }
  }
  if (extrasPaise > 0) lines.push({ id: generateId('item'), name, amount: fromPaise(extrasPaise) })
  return lines
}

export function checkBillFile(file) {
  if (!file) return 'Choose a file.'
  if (file.size > MAX_BILL_BYTES) return 'The file is larger than 5 MB.'
  if (file.type && !BILL_FILE_TYPES.includes(file.type)) return 'Upload a JPEG, PNG or WebP photo, or a PDF.'
  return null
}

export const billService = {
  // Reads the bill into a draft. Nothing is saved until the user posts the expense.
  async parse(groupId, file) {
    const form = new FormData()
    form.append('file', file)
    return toUiBillDraft(await api.upload(`/groups/${groupId}/bills/parse`, form))
  },
}
