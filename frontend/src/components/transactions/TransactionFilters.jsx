import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

export function TransactionFilters({ filters, onChange, categories, accounts }) {
  const set = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
      <Input
        placeholder="Search transactions"
        value={filters.search}
        onChange={(event) => set('search', event.target.value)}
      />
      <Select value={filters.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select value={filters.accountId} onChange={(event) => set('accountId', event.target.value)}>
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </Select>
      <Select value={filters.type} onChange={(event) => set('type', event.target.value)}>
        <option value="">Income & expense</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </Select>
      <Input type="date" value={filters.from} onChange={(event) => set('from', event.target.value)} />
      <Select value={filters.sort} onChange={(event) => set('sort', event.target.value)}>
        <option value="date">Sort by date</option>
        <option value="amount">Sort by amount</option>
      </Select>
    </div>
  )
}
