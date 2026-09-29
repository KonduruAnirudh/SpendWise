from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.enums import CategoryType


def _visible_to(user_id: int):
    return or_(Category.user_id.is_(None), Category.user_id == user_id)


def list_visible(db: Session, user_id: int, category_type: CategoryType | None = None) -> list[Category]:
    stmt = select(Category).where(_visible_to(user_id))
    if category_type is not None:
        stmt = stmt.where(Category.type == category_type)
    return list(db.scalars(stmt.order_by(Category.type, Category.name)))


def get_visible(db: Session, category_id: int, user_id: int) -> Category | None:
    stmt = select(Category).where(Category.id == category_id, _visible_to(user_id))
    return db.scalar(stmt)


def find_visible_by_name(db: Session, user_id: int, name: str) -> Category | None:
    stmt = select(Category).where(_visible_to(user_id), func.lower(Category.name) == name.lower())
    return db.scalar(stmt)


def add(db: Session, category: Category) -> Category:
    db.add(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)