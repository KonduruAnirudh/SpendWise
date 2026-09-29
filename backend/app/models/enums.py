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


class MemberRole(StrEnum):
    OWNER = "owner"
    MEMBER = "member"


class SplitMethod(StrEnum):
    EQUAL = "equal"
    EXACT = "exact"
    PERCENTAGE = "percentage"
    SHARES = "shares"
    ADJUSTMENT = "adjustment"
    REIMBURSEMENT = "reimbursement"
    ITEMIZED = "itemized"


class ChatRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"