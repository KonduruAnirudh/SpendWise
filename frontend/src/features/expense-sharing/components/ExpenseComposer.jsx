import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { formatCurrency } from '../../../utils/formatters'
import { SplitMethodSelector } from './SplitMethodSelector'
import { AdjustmentSplit, EqualSplit, ExactSplit, PercentageSplit, SharesSplit } from './SplitPanels'
import { ReimbursementForm } from './ReimbursementForm'
import { ItemizedExpense } from './ItemizedExpense'

export function ExpenseComposer({ members, split, values, onValues, errors }) {
  const set = (key, value) => onValues({ ...values, [key]: value })

  return (
    <div className="space-y-5">
      {split.method !== 'reimbursement' && (
        <>
          <Input label="Expense name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            {split.method !== 'itemized' && (
              <Input
                type="number"
                label="Amount"
                value={split.amount}
                onChange={(event) => split.setAmount(event.target.value)}
                error={errors.amount || split.errors.amount}
              />
            )}
            <Input type="date" label="Date" value={values.date} onChange={(event) => set('date', event.target.value)} />
          </div>
          <Select label="Paid by" value={split.paidBy} onChange={(event) => split.setPaidBy(event.target.value)} error={errors.paidBy}>
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </>
      )}

      <SplitMethodSelector
        value={split.method}
        onChange={(method) => {
          split.setMethod(method)
          if (method === 'itemized' && split.items.length === 0) split.addItem()
        }}
      />

      {split.method === 'equal' && <EqualSplit splits={split.splits} />}
      {split.method === 'exact' && (
        <ExactSplit
          splits={split.splits}
          amounts={split.exactAmounts}
          onChange={(id, value) => split.setExactAmounts((current) => ({ ...current, [id]: value }))}
        />
      )}
      {split.method === 'percentage' && (
        <PercentageSplit
          splits={split.splits}
          percents={split.percents}
          onChange={(id, value) => split.setPercents((current) => ({ ...current, [id]: value }))}
        />
      )}
      {split.method === 'shares' && (
        <SharesSplit
          splits={split.splits}
          shares={split.shares}
          onChange={(id, value) => split.setShares((current) => ({ ...current, [id]: value }))}
        />
      )}
      {split.method === 'adjustment' && (
        <AdjustmentSplit
          splits={split.splits}
          amounts={split.adjusted}
          remaining={split.remaining}
          onChange={(id, value) => split.setAdjusted((current) => ({ ...current, [id]: value }))}
        />
      )}
      {split.method === 'reimbursement' && (
        <ReimbursementForm
          members={members}
          paidBy={split.paidBy}
          receivedBy={split.receivedBy}
          amount={split.amount}
          onPaidBy={split.setPaidBy}
          onReceivedBy={split.setReceivedBy}
          onAmount={split.setAmount}
          errors={{ ...split.errors, ...errors }}
        />
      )}
      {split.method === 'itemized' && (
        <ItemizedExpense
          members={members}
          items={split.items}
          tax={split.tax}
          tip={split.tip}
          total={split.total}
          onItems={split.setItems}
          onTax={split.setTax}
          onTip={split.setTip}
          onAdd={split.addItem}
          errors={split.errors}
        />
      )}

      {split.method !== 'reimbursement' && split.method !== 'itemized' && split.splits.length > 0 && (
        <p className="text-xs text-subtle">
          Total {formatCurrency(split.total)}
          {split.errors.splits ? ` · ${split.errors.splits}` : ''}
        </p>
      )}
      {(errors.splits || (split.errors.splits && split.method !== 'itemized' && split.method !== 'adjustment')) && (
        <p className="text-xs text-danger">{errors.splits || split.errors.splits}</p>
      )}
      {split.errors.members && <p className="text-xs text-danger">{split.errors.members}</p>}
    </div>
  )
}
