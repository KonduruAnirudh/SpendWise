from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account


def list_for_user(db: Session, user_id: int) -> list[Account]:
    stmt = select(Account).where(Account.user_id == user_id).order_by(Account.created_at)
    return list(db.scalars(stmt))


def get_for_user(db: Session, account_id: int, user_id: int) -> Account | None:
    stmt = select(Account).where(Account.id == account_id, Account.user_id == user_id)
    return db.scalar(stmt)


def get_by_name(db: Session, user_id: int, name: str) -> Account | None:
    stmt = select(Account).where(Account.user_id == user_id, Account.name == name)
    return db.scalar(stmt)


def add(db: Session, account: Account) -> Account:
    db.add(account)
    return account


def delete(db: Session, account: Account) -> None:
    db.delete(account)
    