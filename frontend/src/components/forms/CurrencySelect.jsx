import { Select } from '../ui/Select'
import { CURRENCIES } from '../../utils/constants'

export function CurrencySelect(props) {
  return (
    <Select {...props}>
      {CURRENCIES.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.code} · {currency.name}
        </option>
      ))}
    </Select>
  )
}
