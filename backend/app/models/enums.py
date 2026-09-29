from enum import StrEnum


class AccountType(StrEnum):
    BANK = "bank"
    CREDIT_CARD = "credit_card"
    CASH = "cash"
    SAVINGS = "savings"
    WALLET = "wallet"


class CategoryType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"