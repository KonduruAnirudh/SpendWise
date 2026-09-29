import { useEffect, useMemo, useState } from 'react'
import {
  calculateAdjustedSplit,
  calculateEqualSplit,
  calculateExactSplit,
  calculateItemizedSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  roundMoney,
  validateSplit,
} from '../utils/splitCalculations'
import { generateId } from '../utils/formatters'

function equalRecord(members, total) {
  return Object.fromEntries(calculateEqualSplit(members, total).map((row) => [row.personId, row.amount]))
}

function equalPercents(members) {
  if (!members.length) return {}
  const base = Math.floor(100 / members.length)
  const remainder = 100 - base * members.length
  return Object.fromEntries(members.map((member, index) => [member.id, base + (index < remainder ? 1 : 0)]))
}

function defaultShares(members) {
  return Object.fromEntries(members.map((member) => [member.id, 1]))
}

export function useExpenseSplit({ members = [], initialAmount = '', initialMethod = 'equal' } = {}) {
  const [method, setMethod] = useState(initialMethod)
  const [amount, setAmount] = useState(initialAmount)
  const [paidBy, setPaidBy] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [exactAmounts, setExactAmounts] = useState({})
  const [percents, setPercents] = useState({})
  const [shares, setShares] = useState({})
  const [adjusted, setAdjusted] = useState({})
  const [tax, setTax] = useState(0)
  const [tip, setTip] = useState(0)
  const [items, setItems] = useState([])

  const memberKey = members.map((member) => member.id).join('|')

  useEffect(() => {
    const total = Number(amount) || 0
    setExactAmounts(equalRecord(members, total))
    setAdjusted(equalRecord(members, total))
    // members is derived from memberKey
  }, [memberKey, amount])

  useEffect(() => {
    setPercents((current) => ({ ...equalPercents(members), ...current }))
    setShares((current) => ({ ...defaultShares(members), ...current }))
  }, [memberKey])

  const itemizedTotal = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    return roundMoney(subtotal + Number(tax || 0) + Number(tip || 0))
  }, [items, tax, tip])

  const total = method === 'itemized' ? itemizedTotal : Number(amount) || 0

  const splits = useMemo(() => {
    if (method === 'equal') return calculateEqualSplit(members, total)
    if (method === 'exact') return calculateExactSplit(members, exactAmounts)
    if (method === 'percentage') return calculatePercentageSplit(members, percents, total)
    if (method === 'shares') return calculateSharesSplit(members, shares, total)
    if (method === 'adjustment') return calculateAdjustedSplit(members, adjusted, total).splits
    if (method === 'itemized') return calculateItemizedSplit(members, items, tax, tip)
    if (method === 'reimbursement') {
      const receiver = members.find((member) => member.id === receivedBy)
      return receiver ? [{ personId: receiver.id, memberId: receiver.id, name: receiver.name, amount: total }] : []
    }
    return []
  }, [method, members, total, exactAmounts, percents, shares, adjusted, items, tax, tip, receivedBy])

  const remaining = roundMoney(total) - splits.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const errors = useMemo(
    () =>
      validateSplit({
        method,
        members,
        total,
        splits,
        percentsById: percents,
        sharesById: shares,
        paidBy,
        receivedBy,
      }),
    [method, members, total, splits, percents, shares, paidBy, receivedBy],
  )

  function applyBill(bill) {
    setAmount(bill.total)
    setTax(bill.tax || 0)
    setTip(bill.tip || 0)
    setItems(
      (bill.items || []).map((item) => ({
        ...item,
        assignedPersonIds: item.assignedPersonIds || members.map((member) => member.id),
      })),
    )
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: generateId('item'), name: '', amount: '', assignedPersonIds: members.map((member) => member.id) },
    ])
  }

  return {
    method,
    setMethod,
    amount,
    setAmount,
    paidBy,
    setPaidBy,
    receivedBy,
    setReceivedBy,
    exactAmounts,
    setExactAmounts,
    percents,
    setPercents,
    shares,
    setShares,
    adjusted,
    setAdjusted,
    tax,
    setTax,
    tip,
    setTip,
    items,
    setItems,
    addItem,
    splits,
    remaining,
    total,
    errors,
    applyBill,
    resetEqualAdjustments() {
      setAdjusted(equalRecord(members, Number(amount) || 0))
    },
  }
}
