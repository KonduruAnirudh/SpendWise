const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value).trim())
}

export function validateLogin({ email, password }) {
  const errors = {}
  if (!email?.trim()) errors.email = 'Email is required.'
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  return errors
}

export function validateSignup({ name, email, password, confirmPassword, terms }) {
  const errors = validateLogin({ email, password })
  if (!name?.trim()) errors.name = 'Full name is required.'
  if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  if (!terms) errors.terms = 'Please accept the terms to continue.'
  return errors
}

export function validateTransaction(values) {
  const errors = {}
  if (!values.date) errors.date = 'Date is required.'
  if (!values.type) errors.type = 'Type is required.'
  if (!values.amount || Number(values.amount) <= 0) errors.amount = 'Enter a valid amount.'
  if (!values.description?.trim()) errors.description = 'Description is required.'
  if (!values.categoryId) errors.categoryId = 'Category is required.'
  if (!values.accountId) errors.accountId = 'Account is required.'
  return errors
}

export function validateAccount(values) {
  const errors = {}
  if (!values.name?.trim()) errors.name = 'Account name is required.'
  if (!values.type) errors.type = 'Account type is required.'
  if (values.balance === '' || Number.isNaN(Number(values.balance))) {
    errors.balance = 'Enter a valid balance.'
  }
  return errors
}

export const emptyMember = { name: '', email: '' }

// Group members: a registered user by email, or a guest by name.
export function validateMember({ name, email }) {
  const errors = {}
  if (!name?.trim() && !email?.trim()) errors.name = 'Enter a name, an email, or both.'
  if (email?.trim() && !isValidEmail(email)) errors.email = 'Please enter a valid email address.'
  return errors
}

export function validateSharedExpense(values, splits) {
  const errors = {}
  if (values.splitMethod !== 'reimbursement' && !values.name?.trim()) errors.name = 'Expense name is required.'
  if (!values.amount || Number(values.amount) <= 0) errors.amount = 'Enter a valid amount.'
  if (!values.paidBy) errors.paidBy = 'Select who paid.'
  if (!values.splitMethod) errors.splitMethod = 'Select a split method.'
  if (values.splitMethod === 'reimbursement') {
    if (!values.receivedBy) errors.receivedBy = 'Select who received the reimbursement.'
    if (values.paidBy && values.receivedBy && values.paidBy === values.receivedBy) {
      errors.receivedBy = 'Payer and receiver cannot be the same person.'
    }
    return errors
  }
  const total = splits.reduce((sum, split) => sum + Number(split.amount || 0), 0)
  if (Math.abs(total - Number(values.amount || 0)) > 0.5) {
    errors.splits = 'Split amounts must equal the expense total.'
  }
  return errors
}

// ---------- Profile ----------

export function validateProfileName(name) {
  const value = name?.trim() || ''
  if (!value) return 'Full name is required.'
  if (value.length < 2) return 'Full name must be at least 2 characters.'
  if (value.length > 100) return 'Full name must be 100 characters or fewer.'
  return null
}

// "30,000" and "30 000" are typed often; the separators carry no meaning.
export function normalizeAmountInput(value) {
  return String(value ?? '').replace(/[,\s]/g, '')
}

// Monthly budget is optional; when given it must be a non-negative amount with at most 2 decimals.
export function validateMonthlyBudget(value) {
  if (value === '' || value === null || value === undefined) return null
  const text = normalizeAmountInput(value)
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return 'Enter an amount like 30000 or 30000.50.'
  if (Number(text) > 9999999999.99) return 'That budget is too large.'
  return null
}

// Mirrors the API's password rule (8 to 128 characters).
export const PASSWORD_RULES = [
  { id: 'length', label: '8 to 128 characters', test: (password) => password.length >= 8 && password.length <= 128 },
]

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {}
  if (!currentPassword) errors.currentPassword = 'Enter your current password.'
  if (!newPassword) errors.newPassword = 'Enter a new password.'
  else if (!PASSWORD_RULES.every((rule) => rule.test(newPassword))) errors.newPassword = 'Use 8 to 128 characters.'
  else if (newPassword === currentPassword) errors.newPassword = 'Choose a password different from your current one.'
  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password.'
  else if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords don't match."
  return errors
}
