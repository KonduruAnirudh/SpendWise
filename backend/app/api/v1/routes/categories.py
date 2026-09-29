from fastapi import APIRouter, status

from app.core.dependencies import CurrentUser, DbSession
from app.models.category import Category
from app.models.enums import CategoryType
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    current_user: CurrentUser, db: DbSession, type: CategoryType | None = None
) -> list[Category]:
    return category_service.list_categories(db, current_user, type)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, current_user: CurrentUser, db: DbSession) -> Category:
    return category_service.create_category(db, current_user, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, current_user: CurrentUser, db: DbSession) -> None:
    category_service.delete_category(db, current_user, category_id)