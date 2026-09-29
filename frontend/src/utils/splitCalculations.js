export function roundMoney(value) {
  return Math.round(Number(value) || 0)
}

export function sumAmounts(rows) {
  return rows.reduce((sum, row) => sum + roundMoney(row.amount || 0), 0)
}

export function amountsMatch(total, parts, tolerance = 0.5) {
  return Math.abs(roundMoney(total) - sumAmounts(parts)) <= tolerance
}

function distributeWhole(total, count) {
  const whole = roundMoney(total)
  if (count <= 0) return []
  const base = Math.floor(whole / count)
  const remainder = whole - base * count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}

function withPerson(member, extra = {}) {
  return {
    personId: member.id,
    memberId: member.id,
    name: member.name,
    ...extra,
  }
}

export function calculateEqualSplit(members, total) {
  const amounts = distributeWhole(total, members.length)
  return members.map((member, index) => withPerson(member, { amount: amounts[index] || 0 }))
}

export function calculateExactSplit(members, amountsById = {}) {
  return members.map((member) =>
    withPerson(member, { amount: roundMoney(amountsById[member.id] || 0) }),
  )
}

export function calculatePercentageSplit(members, percentsById = {}, total = 0) {
  const percents = members.map((member) => Number(percentsById[member.id] || 0))
  const raw = members.map((member, index) =>
    withPerson(member, {
      percent: percents[index],
      amount: roundMoney((Number(total) * percents[index]) / 100),
    }),
  )
  return settleRemainder(raw, total)
}

export function calculateSharesSplit(members, sharesById = {}, total = 0) {
  const shares = members.map((member) => Math.max(0, Number(sharesById[member.id] || 0)))
  const totalShares = shares.reduce((sum, value) => sum + value, 0)
  if (!totalShares) {
    return members.map((member) => withPerson(member, { shares: 0, amount: 0 }))
  }
  const raw = members.map((member, index) =>
    withPerson(member, {
      shares: shares[index],
      amount: roundMoney((Number(total) * shares[index]) / totalShares),
    }),
  )
  return settleRemainder(raw, total)
}

export function calculateAdjustedSplit(members, amountsById = {}, total = 0) {
  const splits = calculateExactSplit(members, amountsById)
  return {
    splits,
    remaining: roundMoney(total) - sumAmounts(splits),
  }
}

export function calculateItemizedSplit(members, items = [], tax = 0, tip = 0) {
  const totals = Object.fromEntries(members.map((member) => [member.id, 0]))

  items.forEach((item) => {
    const assigned = (item.assignedPersonIds || []).filter((id) => totals[id] != null)
    if (!assigned.length || !item.amount) return
    const shares = distributeWhole(item.amount, assigned.length)
    assigned.forEach((id, index) => {
      totals[id] += shares[index] || 0
    })
  })

  const itemSubtotal = members.reduce((sum, member) => sum + totals[member.id], 0)
  const extras = roundMoney(tax) + roundMoney(tip)
  if (extras && itemSubtotal > 0) {
    members.forEach((member) => {
      totals[member.id] += roundMoney((extras * totals[member.id]) / itemSubtotal)
    })
  } else if (extras && members.length) {
    const extraShares = distributeWhole(extras, members.length)
    members.forEach((member, index) => {
      totals[member.id] += extraShares[index] || 0
    })
  }

  const splits = members.map((member) => withPerson(member, { amount: roundMoney(totals[member.id]) }))
  const billTotal =
    items.reduce((sum, item) => sum + roundMoney(item.amount || 0), 0) + roundMoney(tax) + roundMoney(tip)
  return settleRemainder(splits, billTotal)
}

function settleRemainder(splits, total) {
  if (!splits.length) return splits
  const diff = roundMoney(total) - sumAmounts(splits)
  if (!diff) return splits
  const next = splits.map((row) => ({ ...row }))
  next[next.length - 1].amount = roundMoney(next[next.length - 1].amount + diff)
  return next
}

export function percentTotal(percentsById = {}) {
  return Object.values(percentsById).reduce((sum, value) => sum + Number(value || 0), 0)
}

export function sharesTotal(sharesById = {}) {
  return Object.values(sharesById).reduce((sum, value) => sum + Number(value || 0), 0)
}

export function validateSplit({ method, members, total, splits, percentsById, sharesById, paidBy, receivedBy }) {
  const errors = {}
  if (!members?.length) errors.members = 'Add at least one member before splitting.'
  if (method !== 'itemized' && method !== 'reimbursement' && (!total || Number(total) <= 0)) {
    errors.amount = 'Enter a valid amount.'
  }

  if (method === 'exact' && !amountsMatch(total, splits)) {
    errors.splits = `Exact amounts must equal ${roundMoney(total)}.`
  }
  if (method === 'percentage' && Math.abs(percentTotal(percentsById) - 100) > 0.5) {
    errors.splits = 'Percentages must add up to 100%.'
  }
  if (method === 'shares') {
    if (sharesTotal(sharesById) <= 0) errors.splits = 'Total shares must be greater than 0.'
    else if (Object.values(sharesById).some((value) => Number(value) < 0)) {
      errors.splits = 'Shares must be positive.'
    }
  }
  if (method === 'adjustment' && !amountsMatch(total, splits)) {
    errors.splits = 'Adjusted amounts must equal the total.'
  }
  if (method === 'itemized') {
    if (!splits.length) errors.splits = 'Assign items to people to calculate a split.'
    if (!amountsMatch(total, splits)) errors.splits = 'Itemized total must match the bill total.'
  }
  if (method === 'reimbursement') {
    if (!paidBy) errors.paidBy = 'Select who paid.'
    if (!receivedBy) errors.receivedBy = 'Select who received the reimbursement.'
    if (paidBy && receivedBy && paidBy === receivedBy) {
      errors.receivedBy = 'Payer and receiver cannot be the same person.'
    }
    if (!total || Number(total) <= 0) errors.amount = 'Amount must be positive.'
  }
  return errors
}
