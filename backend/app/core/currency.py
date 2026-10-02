from typing import Literal

# The currencies SpendWise supports, with their ISO 4217 names. All use 2 decimal places,
# so the split engine's minor-unit ("paise") arithmetic is the same for every one of them.
SUPPORTED_CURRENCIES: dict[str, str] = {
    "INR": "Indian Rupee",
    "USD": "US Dollar",
    "AUD": "Australian Dollar",
    "EUR": "Euro",
    "GBP": "British Pound",
    "CHF": "Swiss Franc",
}

CurrencyCode = Literal["INR", "USD", "AUD", "EUR", "GBP", "CHF"]
