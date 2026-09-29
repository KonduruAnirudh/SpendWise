import { Select } from '../../../components/ui/Select'
import { Input } from '../../../components/ui/Input'

export function ReimbursementForm({ members, paidBy, receivedBy, amount, onPaidBy, onReceivedBy, onAmount, errors }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle">
        One person paid for something that another person received. The receiver owes the payer the full amount.
      </p>
      <Select label="Paid by" value={paidBy} onChange={(event) => onPaidBy(event.target.value)} error={errors.paidBy}>
        <option value="">Select person</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </Select>
      <Select
        label="Received by"
        value={receivedBy}
        onChange={(event) => onReceivedBy(event.target.value)}
        error={errors.receivedBy}
      >
        <option value="">Select person</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        label="Amount"
        value={amount}
        onChange={(event) => onAmount(event.target.value)}
        error={errors.amount}
      />
    </div>
  )
}
