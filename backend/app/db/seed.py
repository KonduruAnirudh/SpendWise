from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.enums import CategoryType

DEFAULT_CATEGORIES: list[tuple[str, CategoryType]] = [
    ("Food", CategoryType.EXPENSE),
    ("Shopping", CategoryType.EXPENSE),
    ("Transport", CategoryType.EXPENSE),
    ("Education", CategoryType.EXPENSE),
    ("Entertainment", CategoryType.EXPENSE),
    ("Bills", CategoryType.EXPENSE),
    ("Health", CategoryType.EXPENSE),
    ("Travel", CategoryType.EXPENSE),
    ("Other", CategoryType.EXPENSE),
    ("Salary", CategoryType.INCOME),
    ("Other Income", CategoryType.INCOME),
]


def seed_default_categories(db: Session) -> None:
    db.add_all(Category(name=name, type=category_type) for name, category_type in DEFAULT_CATEGORIES)
    db.commit()