// Live split preview. Mirrors backend/app/services/splitting: integer paise and
// largest-remainder rounding, so the preview shows exactly what the server will save.
// The server recomputes every split and remains the source of truth.

export function toPaise(value) {
  return Math.round((Number(value) || 0) * 100)
}

export function fromPaise(paise) {
  return paise / 100
}

// Rounds to the nearest paisa (not the nearest rupee).
export function roundMoney(value) {
  return fromPaise(toPaise(value))
}

export function sumAmounts(rows) {
  return fromPaise(rows.reduce((sum, row) => sum + toPaise(row.amount), 0))
}

export function amountsMatch(total, parts) {
  return toPaise(total) === rows(parts).reduce((sum, row) => sum + toPaise(row.amount), 0)
}

function rows(value) {
  return value || []
}

// Split totalPaise in proportion to weights (largest-remainder method, exact BigInt arithmetic).
// Ties go to the earlier member; members arrive ordered by id, like the backend's tie-break.
function allocate(totalPaise, weights) {
  const scaled = weights.map((weight) => BigInt(Math.max(0, Math.round((Number(weight) || 0) * 100))))
  const weightSum = scaled.reduce((sum, weight) => sum + weight, 0n)
  if (weightSum === 0n || totalPaise <= 0) return weights.map(() => 0)

  const total = BigInt(totalPaise)
  const shares = scaled.map((weight) => (total * weight) / weightSum)
  const remainders = scaled.map((weight, index) => total * weight - shares[index] * weightSum)
  const leftover = Number(total - shares.reduce((sum, share) => sum + share, 0n))
  const order = remainders
    .map((_, index) => index)
    .sort((a, b) => (remainders[b] > remainders[a] ? 1 : remainders[b] < remainders[a] ? -1 : a - b))
  order.slice(0, leftover).forEach((index) => {
    shares[index] += 1n
  })
  return shares.map(Number)
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
  const paise = allocate(toPaise(total), members.map(() => 1))
  return members.map((member, index) => withPerson(member, { amount: fromPaise(paise[index]) }))
}

export function calculateExactSplit(members, amountsById = {}) {
  return members.map((member) => withPerson(member, { amount: roundMoney(amountsById[member.id]) }))
}

export function calculatePercentageSplit(members, percentsById = {}, total = 0) {
  const percents = members.map((member) => Number(percentsById[member.id] || 0))
  const paise = allocate(toPaise(total), percents)
  return members.map((member, index) =>
    withPerson(member, { percent: percents[index], amount: fromPaise(paise[index]) }),
  )
}

export function calculateSharesSplit(members, sharesById = {}, total = 0) {
  const shares = members.map((member) => Math.max(0, Number(sharesById[member.id] || 0)))
  const paise = allocate(toPaise(total), shares)
  return members.map((member, index) =>
    withPerson(member, { shares: shares[index], amount: fromPaise(paise[index]) }),
  )
}

// Adjustment: each person's extra (+/−) is taken off the top; the rest is split equally.
export function calculateAdjustedSplit(members, extrasById = {}, total = 0) {
  const extras = members.map((member) => toPaise(extrasById[member.id]))
  const remainingPaise = toPaise(total) - extras.reduce((sum, value) => sum + value, 0)
  const base = remainingPaise > 0 ? allocate(remainingPaise, members.map(() => 1)) : members.map(() => 0)
  const splits = members.map((member, index) =>
    withPerson(member, { extra: fromPaise(extras[index]), amount: fromPaise(base[index] + extras[index]) }),
  )
  return { splits, remaining: fromPaise(remainingPaise) }
}

// Tax and tip are sent to the server as extra items shared by every member.
export function itemizedLines(members, items = [], tax = 0, tip = 0) {
  const everyone = members.map((member) => member.id)
  const lines = items.map((item, index) => ({
    description: item.name?.trim() || `Item ${index + 1}`,
    amount: roundMoney(item.amount),
    memberIds: (item.assignedPersonIds || []).filter((id) => everyone.includes(id)),
  }))
  if (toPaise(tax) > 0) lines.push({ description: 'Tax', amount: roundMoney(tax), memberIds: everyone })
  if (toPaise(tip) > 0) lines.push({ description: 'Tip', amount: roundMoney(tip), memberIds: everyone })
  return lines
}

export function calculateItemizedSplit(members, items = [], tax = 0, tip = 0) {
  const totals = Object.fromEntries(members.map((member) => [member.id, 0]))
  itemizedLines(members, items, tax, tip).forEach((line) => {
    if (!line.memberIds.length || line.amount <= 0) return
    // Allocate in member order so ties match the server.
    const assigned = members.filter((member) => line.memberIds.includes(member.id))
    const paise = allocate(toPaise(line.amount), assigned.map(() => 1))
    assigned.forEach((member, index) => {
      totals[member.id] += paise[index]
    })
  })
  return members.map((member) => withPerson(member, { amount: fromPaise(totals[member.id]) }))
}

export function percentTotal(percentsById = {}) {
  return fromPaise(Object.values(percentsById).reduce((sum, value) => sum + toPaise(value), 0))
}

export function sharesTotal(sharesById = {}) {
  return Object.values(sharesById).reduce((sum, value) => sum + (Number(value) || 0), 0)
}

// Mirrors the server's rules so most mistakes are caught before a request is sent.
export function validateSplit({ method, members, total, splits, percentsById, sharesById, extrasById, items, paidBy, receivedBy }) {
  const errors = {}
  const totalPaise = toPaise(total)
  const splitPaise = rows(splits).reduce((sum, row) => sum + toPaise(row.amount), 0)

  if (!members?.length) errors.members = 'Add at least one member before splitting.'
  if (method !== 'itemized' && totalPaise <= 0) errors.amount = 'Enter a valid amount.'

  if (method === 'exact' && splitPaise !== totalPaise) {
    errors.splits = `Exact amounts add up to ${fromPaise(splitPaise).toFixed(2)}, not ${fromPaise(totalPaise).toFixed(2)}.`
  }
  if (method === 'percentage') {
    const sum = toPaise(percentTotal(percentsById))
    if (sum !== 10000) errors.splits = `Percentages add up to ${fromPaise(sum)}%, not 100%.`
    else if (Object.values(percentsById || {}).some((value) => Number(value) < 0)) {
      errors.splits = 'Percentages cannot be negative.'
    }
  }
  if (method === 'shares') {
    if (Object.values(sharesById || {}).some((value) => Number(value) < 0)) errors.splits = 'Shares cannot be negative.'
    else if (sharesTotal(sharesById) <= 0) errors.splits = 'Total shares must be greater than 0.'
  }
  if (method === 'adjustment') {
    const extras = rows(members).reduce((sum, member) => sum + toPaise(extrasById?.[member.id]), 0)
    if (extras > totalPaise) errors.splits = 'Adjustments add up to more than the total.'
    else if (rows(splits).some((row) => toPaise(row.amount) < 0)) {
      errors.splits = "An adjustment makes someone's share negative."
    }
  }
  if (method === 'itemized') {
    const lines = rows(items)
    if (!lines.length) errors.splits = 'Add at least one item.'
    else if (lines.some((item) => toPaise(item.amount) <= 0)) errors.splits = 'Every item needs an amount.'
    else if (lines.some((item) => !(item.assignedPersonIds || []).length)) {
      errors.splits = 'Assign every item to at least one person.'
    } else if (splitPaise !== totalPaise) errors.splits = 'Itemized total must match the bill total.'
  }
  if (method === 'reimbursement') {
    if (!paidBy) errors.paidBy = 'Select who paid.'
    if (!receivedBy) errors.receivedBy = 'Select who received it.'
    if (paidBy && receivedBy && String(paidBy) === String(receivedBy)) {
      errors.receivedBy = 'Payer and receiver cannot be the same person.'
    }
    if (totalPaise <= 0) errors.amount = 'Amount must be positive.'
  }
  return errors
}
