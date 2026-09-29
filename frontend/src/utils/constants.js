export const APP_NAME = 'SpendWise'
export const APP_TAGLINE = 'Understand your money. Spend it wisely.'
export const DASHBOARD_QUOTE =
  'Small choices today create better financial habits tomorrow.'

export const AUTH_STORAGE_KEY = 'spendwise.auth'
export const THEME_STORAGE_KEY = 'spendwise.theme'
export const PREFERENCES_STORAGE_KEY = 'spendwise.preferences'

export const DEMO_CREDENTIALS = {
  email: 'demo@spendwise.com',
  password: 'SpendWise123',
}

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
]

export const PAYMENT_MODES = [
  'Credit Card',
  'Debit Card',
  'UPI',
  'Cash',
  'Bank Transfer',
  'Other',
]

export const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

export const SPLIT_METHODS = [
  { value: 'equal', label: 'Equal', shortLabel: 'Equal' },
  { value: 'exact', label: 'Exact Amount', shortLabel: 'Exact' },
  { value: 'percentage', label: 'Percentage', shortLabel: '%' },
  { value: 'shares', label: 'Shares', shortLabel: 'Shares' },
  { value: 'adjustment', label: 'Adjustment', shortLabel: 'Adjust' },
  { value: 'reimbursement', label: 'Reimbursement', shortLabel: 'Reimburse' },
  { value: 'itemized', label: 'Itemized', shortLabel: 'Itemized' },
]

export const INCOME_TRACKING_OPTIONS = [
  {
    value: 'regular',
    label: 'Yes, I have regular income',
    description: 'Salary or a predictable monthly inflow.',
  },
  {
    value: 'occasional',
    label: 'Occasionally',
    description: 'Freelance, gifts, or irregular credits.',
  },
  {
    value: 'none',
    label: "No, I'm mainly tracking expenses",
    description: 'Best for students and expense-first tracking.',
  },
]

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']
export const DATE_FORMATS = [
  { value: 'dd MMM', label: '15 Aug' },
  { value: 'yyyy-mm-dd', label: '2026-08-15' },
  { value: 'long', label: '15 August 2026' },
]

export const PAGE_SIZE = 8

export const CATEGORY_COLORS = {
  Food: '#d4af37',
  Shopping: '#c17f59',
  Transport: '#6b8cae',
  Entertainment: '#8b7bb8',
  Bills: '#7a9e7e',
  Healthcare: '#c46b7a',
  Education: '#6a9aa0',
  Travel: '#b08968',
  Salary: '#5dba7a',
  Investment: '#7d8f69',
  Other: '#9c9a92',
}
