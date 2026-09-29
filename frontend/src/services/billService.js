import { billsApi } from '../api/billsApi'
import { withMock } from './mockStore'
import { delay, generateId } from '../utils/formatters'
import { extractedBills } from '../mock/bills'

const uploads = new Map()

function pickTemplate(fileName = '') {
  return /pdf/i.test(fileName) ? extractedBills.restaurant : extractedBills.default
}

export const billService = {
  async uploadBill(file) {
    return withMock(
      async () => {
        const id = generateId('bill')
        const record = {
          id,
          fileName: file?.name || 'bill.jpg',
          status: 'uploaded',
        }
        uploads.set(id, record)
        return record
      },
      () => billsApi.upload({ fileName: file?.name }),
    )
  },

  async extractBillItems(id) {
    return withMock(
      async () => {
        await delay(900)
        const upload = uploads.get(id) || { id, fileName: 'bill.jpg' }
        const template = pickTemplate(upload.fileName)
        const bill = {
          ...template,
          id,
          fileName: upload.fileName,
          items: template.items.map((item) => ({ ...item })),
        }
        uploads.set(id, { ...upload, status: 'extracted', bill })
        return bill
      },
      () => billsApi.extract(id),
    )
  },

  async reviewBill(id, payload) {
    return withMock(
      () => {
        const next = normalizeBill({ ...payload, id })
        const upload = uploads.get(id) || { id }
        uploads.set(id, { ...upload, status: 'reviewed', bill: next })
        return next
      },
      () => billsApi.review(id, payload),
    )
  },

  async confirmBill(id, payload) {
    return withMock(
      () => {
        const bill = normalizeBill(payload || uploads.get(id)?.bill || {})
        return { ...bill, id, status: 'confirmed' }
      },
      () => billsApi.confirm(id, payload),
    )
  },
}

export function normalizeBill(bill) {
  const items = (bill.items || [])
    .filter((item) => !item.removed)
    .map((item, index) => ({
      id: item.id || `bill_item_${index}`,
      name: item.name || `Item ${index + 1}`,
      amount: Number(item.amount) || 0,
    }))
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const tax = Number(bill.tax) || 0
  const tip = Number(bill.tip) || 0
  return {
    ...bill,
    items,
    subtotal,
    tax,
    tip,
    total: subtotal + tax + tip,
  }
}
