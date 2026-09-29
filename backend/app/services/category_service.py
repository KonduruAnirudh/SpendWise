from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.category import Category
from app.models.enums import CategoryType
from app.models.user import User
from app.repositories import category_repository
from app.schemas.category import CategoryCreate

DUPLICATE_NAME = "A category with this name already exists"
CATEGORY_IN_USE = "This category is used by transactions and cannot be deleted."


def list_categories(db: Session, user: User, category_type: CategoryType | None = None) -> list[Category]:
    return category_repository.list_visible(db, user.id, category_type)


def get_category(db: Session, user: User, category_id: int) -> Category:
    category = category_repository.get_visible(db, category_id, user.id)
    if category is None:
        raise NotFoundError("Category not found")
    return category


def create_category(db: Session, user: User, data: CategoryCreate) -> Category:
    name = data.name.strip()
    if category_repository.find_visible_by_name(db, user.id, name) is not None:
        raise ConflictError(DUPLICATE_NAME)

    category = Category(user_id=user.id, name=name, type=data.type)
    category_repository.add(db, category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(DUPLICATE_NAME)
    db.refresh(category)
    return category


def delete_category(db: Session, user: User, category_id: int) -> None:
    category = get_category(db, user, category_id)
    if category.is_system:
        raise ForbiddenError("System categories cannot be deleted")
    category_repository.delete(db, category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(CATEGORY_IN_USE)